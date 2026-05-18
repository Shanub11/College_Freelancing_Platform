import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal as internalApi } from "./_generated/api";

const internal = internalApi as any;

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

// ============================================================
// MIGRATION: normalizeOrderStatus
// Converts all legacy orders with status "in_progress" to "active".
// "in_progress" was the original status before "active" was introduced.
// Run this ONCE from the admin dashboard after deploying the schema change.
// After running and confirming 0 remaining, the v.literal("in_progress")
// can be removed from the orders status union in schema.ts.
// ============================================================
export const normalizeOrderStatus = mutation({
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

    // Find all orders with the legacy "in_progress" status
    const legacyOrders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .collect();

    let count = 0;
    for (const order of legacyOrders) {
      await ctx.db.patch(order._id, { status: "active" });
      count++;
    }

    return `Successfully normalized ${count} orders from "in_progress" to "active". ` +
      `If count is 0, you can safely remove v.literal("in_progress") from schema.ts.`;
  },
});

// ============================================================
// MIGRATION: encryptExistingMessages
// Encrypts all plaintext messages in batches of 50.
// Run repeatedly from the admin dashboard until it returns 
// "0 messages remaining". Each run processes 50 messages.
// After all messages are encrypted, isEncrypted will be true 
// on all message documents.
// ============================================================
export const encryptExistingMessages = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized: must be logged in");

    const isAdmin = await ctx.runQuery(
      internal.adminHelpers.checkIsAdminById,
      { userId }
    );
    if (!isAdmin) throw new Error("Unauthorized: admin access required");

    // Find unencrypted messages in batches of 50
    const unencryptedMessages = await ctx.db
      .query("messages")
      .filter((q) =>
        q.or(
          q.eq(q.field("isEncrypted"), false),
          q.eq(q.field("isEncrypted"), undefined)
        )
      )
      .take(50);

    if (unencryptedMessages.length === 0) {
      return "All messages are encrypted. Migration complete.";
    }

    // Schedule encryption for each message via Node.js action
    for (const message of unencryptedMessages) {
      await ctx.scheduler.runAfter(
        0,
        internal.encryptionActions.encryptStoredMessage,
        { messageId: message._id }
      );
    }

    return (
      `Scheduled encryption for ${unencryptedMessages.length} messages. ` +
      `Run again to process next batch.`
    );
  },
});
