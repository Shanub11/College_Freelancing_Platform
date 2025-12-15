import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getOrCreateConversation = mutation({
  args: {
    projectId: v.id("projectRequests"),
    clientId: v.id("users"),
    freelancerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Check if conversation exists
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_project_client_freelancer", (q) =>
        q
          .eq("projectId", args.projectId)
          .eq("clientId", args.clientId)
          .eq("freelancerId", args.freelancerId)
      )
      .unique();

    if (existing) {
      return existing._id;
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      text: args.text,
      createdAt: Date.now(),
      seen: false,
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

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

export const getConversations = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get conversations where user is client
    const asClient = await ctx.db
      .query("conversations")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .collect();

    // Get conversations where user is freelancer
    const asFreelancer = await ctx.db
      .query("conversations")
      .withIndex("by_freelancer", (q) => q.eq("freelancerId", userId))
      .collect();

    // Combine and sort by most recent update
    const allConversations = [...asClient, ...asFreelancer].sort((a, b) => b.updatedAt - a.updatedAt);

    // Enrich with other participant's details and unread count
    return await Promise.all(allConversations.map(async (c) => {
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