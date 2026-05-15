import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// ============================================================
// MIGRATION FUNCTIONS - ADMIN ONLY
// These mutations are one-time data fixes. They are protected
// by admin checks. Do NOT call these in production without
// verifying the migration is still needed first.
// ============================================================

export const fixBudgets = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Admin guard
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized: must be logged in");
    
    const isAdmin = await ctx.runQuery(
      internal.adminHelpers.checkIsAdminById, 
      { userId }
    );
    if (!isAdmin) throw new Error("Unauthorized: admin access required");

    // Migration logic
    const projects = await ctx.db.query("projectRequests").collect();
    let count = 0;
    
    for (const project of projects) {
      if (project.budget && typeof project.budget === "object") {
        const flatBudget = 
          (project.budget as any).max || 
          (project.budget as any).min || 
          0;
        await ctx.db.patch(project._id, { budget: flatBudget });
        count++;
      }
    }
    return `Successfully updated ${count} old projects.`;
  },
});

export const backfillConversationUnreadCounts = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Admin guard
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized: must be logged in");
    
    const isAdmin = await ctx.runQuery(
      internal.adminHelpers.checkIsAdminById, 
      { userId }
    );
    if (!isAdmin) throw new Error("Unauthorized: admin access required");

    // Migration logic
    const conversations = await ctx.db.query("conversations").collect();
    let count = 0;
    
    for (const conversation of conversations) {
      if (
        conversation.clientUnreadCount === undefined || 
        conversation.freelancerUnreadCount === undefined
      ) {
        await ctx.db.patch(conversation._id, {
          clientUnreadCount: conversation.clientUnreadCount ?? 0,
          freelancerUnreadCount: conversation.freelancerUnreadCount ?? 0,
        });
        count++;
      }
    }
    return `Successfully backfilled unread counts for ${count} conversations.`;
  },
});