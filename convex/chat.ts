import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { enforceModeration } from "./moderation";
import { enforceRateLimit } from "./rateLimiter";
import { Id } from "./_generated/dataModel";

export const getOrCreateConversation = mutation({
  args: {
    projectId: v.optional(v.id("projectRequests")),
    clientId: v.id("users"),
    freelancerId: v.id("users"),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // RACE CONDITION FIX: Use deterministic participant IDs.
    // Sort both user IDs so the pair is always stored in the same order
    // regardless of who initiates — this prevents duplicate conversations.
    const ids = [args.clientId as string, args.freelancerId as string].sort();
    const participant1Id = ids[0] as Id<"users">;
    const participant2Id = ids[1] as Id<"users">;

    // Primary lookup: use the deterministic index (fast, no duplicates).
    const existingByParticipants = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) =>
        q.eq("participant1Id", participant1Id).eq("participant2Id", participant2Id)
      )
      .first();

    if (existingByParticipants) {
      return existingByParticipants._id;
    }

    // Fallback: check legacy conversations that predate the participant fields.
    // These were created before the by_participants index was added.
    const legacyAsClient = await ctx.db
      .query("conversations")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("freelancerId"), args.freelancerId))
      .first();

    if (legacyAsClient) {
      // Backfill participant fields so future lookups use the fast index.
      await ctx.db.patch(legacyAsClient._id, { participant1Id, participant2Id });
      return legacyAsClient._id;
    }

    const legacyAsFreelancer = await ctx.db
      .query("conversations")
      .withIndex("by_freelancer", (q) => q.eq("freelancerId", args.clientId))
      .filter((q) => q.eq(q.field("clientId"), args.freelancerId))
      .first();

    if (legacyAsFreelancer) {
      // Backfill participant fields so future lookups use the fast index.
      await ctx.db.patch(legacyAsFreelancer._id, { participant1Id, participant2Id });
      return legacyAsFreelancer._id;
    }

    // No existing conversation found — create a new one with participant fields.
    const conversationId = await ctx.db.insert("conversations", {
      projectId: args.projectId,
      clientId: args.clientId,
      freelancerId: args.freelancerId,
      updatedAt: Date.now(),
      clientUnreadCount: 0,
      freelancerUnreadCount: 0,
      participant1Id,
      participant2Id,
    });

    return conversationId;
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
    attachment: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // SECURITY FIX: Verify sender is a participant before sending.
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const isParticipant =
      conversation.clientId === userId ||
      conversation.freelancerId === userId;

    if (!isParticipant) {
      throw new Error("Unauthorized: You are not part of this conversation");
    }

    // Server-side message length validation
    if (args.text.trim().length === 0) {
      throw new Error("Message cannot be empty.");
    }
    if (args.text.length > 5000) {
      throw new Error("Message is too long. Maximum 5000 characters allowed.");
    }
    await enforceRateLimit(
      ctx,
      userId as Id<"users">,
      "message_send",
      20,
      60 * 1000,
      "You are sending messages too quickly. Please slow down."
    );

    await enforceModeration(ctx, userId, args.text, "chat");

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      text: args.text,
      createdAt: Date.now(),
      seen: false,
      attachment: args.attachment,
    });

    let clientUnreadCount = conversation.clientUnreadCount || 0;
    let freelancerUnreadCount = conversation.freelancerUnreadCount || 0;

    if (userId === conversation.clientId) {
      freelancerUnreadCount += 1;
    } else if (userId === conversation.freelancerId) {
      clientUnreadCount += 1;
    }

    await ctx.db.patch(args.conversationId, {
      lastMessage: args.text,
      updatedAt: Date.now(),
      clientUnreadCount,
      freelancerUnreadCount,
    });

    return null;
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // SECURITY FIX: Verify the requesting user is actually a participant
    // in this conversation before returning any messages.
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

    const isParticipant =
      conversation.clientId === userId ||
      conversation.freelancerId === userId;

    if (!isParticipant) {
      // Do not throw — returning empty array avoids leaking 
      // whether the conversation exists at all.
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    return await Promise.all(messages.map(async (msg) => {
      return {
        ...msg,
        attachmentUrl: msg.attachment
          ? await ctx.storage.getUrl(msg.attachment)
          : null,
      };
    }));
  },
});

export const getConversations = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: "" };

    // Use indexed queries instead of full table scan filter.
    // Fetch conversations where user is either the client or the freelancer.
    // We take up to 50 from each side then merge and sort.
    const asClient = await ctx.db
      .query("conversations")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .order("desc")
      .take(50);

    const asFreelancer = await ctx.db
      .query("conversations")
      .withIndex("by_freelancer", (q) => q.eq("freelancerId", userId))
      .order("desc")
      .take(50);

    // Merge both lists, remove duplicates by _id
    const seen = new Set<string>();
    const allConversations: typeof asClient = [];
    
    for (const conv of [...asClient, ...asFreelancer]) {
      if (!seen.has(conv._id)) {
        seen.add(conv._id);
        allConversations.push(conv);
      }
    }

    // Sort merged list by updatedAt descending
    allConversations.sort((a, b) => b.updatedAt - a.updatedAt);

    // Apply manual pagination using paginationOpts
    // paginationOptsValidator gives us numItems and cursor
    const numItems = args.paginationOpts.numItems ?? 20;
    const cursor = args.paginationOpts.cursor;
    
    // Find the start index based on cursor
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = allConversations.findIndex(
        (c) => c._id === cursor
      );
      startIndex = cursorIndex !== -1 ? cursorIndex + 1 : 0;
    }

    const pageConversations = allConversations.slice(
      startIndex, 
      startIndex + numItems
    );
    
    const isDone = startIndex + numItems >= allConversations.length;
    const lastItem = pageConversations[pageConversations.length - 1];
    const continueCursor = isDone ? "" : (lastItem?._id ?? "");

    // Deduplicate by other participant (keep most recent conv per person)
    const uniqueConversations: typeof pageConversations = [];
    const seenUsers = new Set<string>();
    
    for (const c of pageConversations) {
      const otherUserId = c.clientId === userId 
        ? c.freelancerId 
        : c.clientId;
      if (!seenUsers.has(otherUserId)) {
        seenUsers.add(otherUserId);
        uniqueConversations.push(c);
      }
    }

    // Enrich with other participant's details and unread count
    const page = await Promise.all(
      uniqueConversations.map(async (c) => {
        const otherUserId = c.clientId === userId 
          ? c.freelancerId 
          : c.clientId;
        
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", otherUserId))
          .unique();

        const unreadCount =
          userId === c.clientId
            ? (c.clientUnreadCount || 0)
            : (c.freelancerUnreadCount || 0);

        return {
          _id: c._id,
          otherUserId,
          otherUserName: profile
            ? `${profile.firstName} ${profile.lastName}`
            : "Unknown User",
          otherUserPicture: profile?.profilePicture,
          lastMessage: c.lastMessage,
          updatedAt: c.updatedAt,
          unreadCount,
        };
      })
    );

    return {
      page,
      isDone,
      continueCursor,
    };
  }
});

export const markAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_seen", (q) => 
        q.eq("conversationId", args.conversationId).eq("seen", false)
      )
      .filter(q => q.neq(q.field("senderId"), userId))
      .collect();

    for (const msg of messages) {
      await ctx.db.patch(msg._id, { seen: true });
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      if (userId === conversation.clientId) {
        await ctx.db.patch(args.conversationId, { clientUnreadCount: 0 });
      } else {
        await ctx.db.patch(args.conversationId, { freelancerUnreadCount: 0 });
      }
    }

    return null;
  }
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  }
});