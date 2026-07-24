import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { enforceRateLimit } from "./rateLimiter";
import { Id } from "./_generated/dataModel";

// ─── Public Mutation ────────────────────────────────────────────────────────

export const submitContactForm = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    projectId: v.optional(v.string()),
    source: v.union(v.literal("landing"), v.literal("dashboard")),
    // Honeypot field: bots fill every input; humans leave this blank.
    // Never render this in the UI. Server silently drops filled submissions.
    _hp: v.optional(v.string()),
  },
  returns: v.id("contactMessages"),
  handler: async (ctx, args) => {
    // Honeypot: if a bot filled the hidden field, return a fake success.
    if (args._hp && args._hp.length > 0) {
      return "fake_success" as unknown as Id<"contactMessages">;
    }

    // Basic input bounds
    if (args.message.trim().length < 10) {
      throw new ConvexError("Message must be at least 10 characters.");
    }
    if (args.message.length > 5000) {
      throw new ConvexError("Message is too long. Maximum 5000 characters.");
    }

    // Detect authenticated user (optional — contact form is public)
    let userId: ReturnType<typeof getAuthUserId> extends Promise<infer T> ? T : never;
    try {
      userId = await getAuthUserId(ctx);
    } catch {
      userId = null;
    }

    // Item 3: Rate limit authenticated users (3 per hour).
    // Unauthenticated submissions are guarded by the honeypot above.
    if (userId) {
      await enforceRateLimit(
        ctx,
        userId as Id<"users">,
        "contact_form",
        3,
        60 * 60 * 1000,
        "You can only send 3 messages per hour. Please try again later."
      );
    }

    const messageId = await ctx.db.insert("contactMessages", {
      name: args.name,
      email: args.email,
      subject: args.subject,
      message: args.message,
      projectId: args.projectId || undefined,
      userId: userId ?? undefined,
      status: "open",
      source: userId ? "dashboard" : args.source,
    });

    await ctx.scheduler.runAfter(0, internal.email.sendContactNotification, {
      name: args.name,
      email: args.email,
      subject: args.subject,
      messageId,
    });

    return messageId;
  },
});

// ─── Admin-Only Query ───────────────────────────────────────────────────────

export const getContactMessages = query({
  args: {},
  handler: async (ctx) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) throw new ConvexError("Unauthorized");

    const isAdmin = await ctx.runQuery(
      internal.adminHelpers.checkIsAdminById,
      { userId: adminId }
    );
    if (!isAdmin) {
      throw new ConvexError("Unauthorized");
    }

    const messages = await ctx.db
      .query("contactMessages")
      .order("desc")
      .take(200);

    return messages;
  },
});

// ─── Admin-Only Status Update ───────────────────────────────────────────────

export const updateContactStatus = mutation({
  args: {
    messageId: v.id("contactMessages"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved")
    ),
    adminNote: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) throw new ConvexError("Unauthorized");

    const isAdmin = await ctx.runQuery(
      internal.adminHelpers.checkIsAdminById,
      { userId: adminId }
    );
    if (!isAdmin) {
      throw new ConvexError("Unauthorized");
    }

    const patch: Record<string, unknown> = { status: args.status };

    if (args.adminNote !== undefined) {
      patch.adminNote = args.adminNote;
    }

    if (args.status === "resolved") {
      patch.resolvedAt = Date.now();
    }

    await ctx.db.patch(args.messageId, patch);

    return null;
  },
});

// ─── Authenticated User Query ───────────────────────────────────────────────

export const getMyContactMessages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthorized");

    const messages = await ctx.db
      .query("contactMessages")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return messages;
  },
});
