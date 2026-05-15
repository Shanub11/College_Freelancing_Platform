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

    // Check if conversation exists between these two users (ignoring project)
    const existingAsClient = await ctx.db
      .query("conversations")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("freelancerId"), args.freelancerId))
      .first();

    if (existingAsClient) {
      return existingAsClient._id;
    }

    const existingAsFreelancer = await ctx.db
      .query("conversations")
      .withIndex("by_freelancer", (q) => q.eq("freelancerId", args.clientId))
      .filter((q) => q.eq(q.field("clientId"), args.freelancerId))
      .first();

    if (existingAsFreelancer) {
      return existingAsFreelancer._id;
    }

    // Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      projectId: args.projectId,
      clientId: args.clientId,
      freelancerId: args.freelancerId,
      updatedAt: Date.now(),
      clientUnreadCount: 0,
      freelancerUnreadCount: 0,
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

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

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
        attachmentUrl: msg.attachment ? await ctx.storage.getUrl(msg.attachment) : null,
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

    const conversations = await ctx.db
      .query("conversations")
      .filter((q) =>
        q.or(
          q.eq(q.field("clientId"), userId),
          q.eq(q.field("freelancerId"), userId)
        )
      )
      .paginate(args.paginationOpts);

    // Deduplicate by other participant to ensure only one chat card per person
    const uniqueConversations = [];
    const seenUsers = new Set<string>();
    for (const c of conversations.page) {
      const otherUserId = c.clientId === userId ? c.freelancerId : c.clientId;
      if (!seenUsers.has(otherUserId)) {
        seenUsers.add(otherUserId);
        uniqueConversations.push(c);
      }
    }

    // Enrich with other participant's details and unread count
    const page = await Promise.all(uniqueConversations.map(async (c) => {
      const otherUserId = c.clientId === userId ? c.freelancerId : c.clientId;
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", otherUserId))
        .unique();
      
      const unreadCount = userId === c.clientId 
        ? (c.clientUnreadCount || 0)
        : (c.freelancerUnreadCount || 0);

      return {
        _id: c._id,
        otherUserId,
        otherUserName: profile ? `${profile.firstName} ${profile.lastName}` : "Unknown User",
        otherUserPicture: profile?.profilePicture,
        lastMessage: c.lastMessage,
        updatedAt: c.updatedAt,
        unreadCount
      };
    }));

    page.sort((a, b) => b.updatedAt - a.updatedAt);

    return {
      ...conversations,
      page
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