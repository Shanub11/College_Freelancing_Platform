import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const fixBudgets = mutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projectRequests").collect();
    let count = 0;
    
    for (const project of projects) {
      // Check if budget is an object containing min/max
      if (project.budget && typeof project.budget === "object") {
        const flatBudget = project.budget.max || project.budget.min || 0;
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
    const conversations = await ctx.db.query("conversations").collect();
    let count = 0;
    
    for (const conversation of conversations) {
      if (conversation.clientUnreadCount === undefined || conversation.freelancerUnreadCount === undefined) {
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