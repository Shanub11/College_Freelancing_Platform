import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { enforceModeration } from "./moderation";

export const getOrCreateConversation = mutation({
  args: {
    projectId: v.id("projectRequests"),
    clientId: v.id("users"),
    freelancerId: v.id("users"),
  },
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
      .withIndex("by_client", (q) => q.eq("clientId", args.freelancerId))
      .filter((q) => q.eq(q.field("freelancerId"), args.clientId))
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
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    await enforceModeration(ctx, userId, args.text, "chat");

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      text: args.text,
      createdAt: Date.now(),
      seen: false,
      attachment: args.attachment,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessage: args.text,
      updatedAt: Date.now(),
    });
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
      
      const unreadCount = (await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
        .filter(q => q.neq(q.field("senderId"), userId))
        .filter(q => q.eq(q.field("seen"), false))
        .collect()).length;

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
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter(q => q.neq(q.field("senderId"), userId))
      .filter(q => q.eq(q.field("seen"), false))
      .collect();

    for (const msg of messages) {
      await ctx.db.patch(msg._id, { seen: true });
    }
  }
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});