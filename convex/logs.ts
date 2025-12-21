import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getLogs = query({
  args: {
    action: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    performerName: v.optional(v.string()),
    date: v.optional(v.string()), // Format: YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    const adminEmails = ["admin@collegeskills.com", "owner@collegeskills.com", "admin123@gmail.com"];
    
    if (!adminEmails.includes(user?.email || "")) {
      return [];
    }

    let logsQuery;

    // Date Filter (Range on timestamp index)
    if (args.date) {
      const start = new Date(args.date).getTime();
      const end = start + 24 * 60 * 60 * 1000; // End of the day
      logsQuery = ctx.db.query("activityLogs").withIndex("by_timestamp", (q) => 
        q.gte("timestamp", start).lt("timestamp", end)
      );
    } else {
      logsQuery = ctx.db.query("activityLogs").withIndex("by_timestamp");
    }

    let matchingUserIds: string[] | undefined;
    if (args.performerName) {
      const profiles = await ctx.db.query("profiles").collect();
      const searchName = args.performerName.toLowerCase();
      matchingUserIds = profiles
        .filter((p) => {
          const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
          return fullName.includes(searchName);
        })
        .map((p) => p.userId);

      if (matchingUserIds.length === 0) {
        return [];
      }
    }

    // Apply Action and User Filters
    const logs = await logsQuery
      .order("desc")
      .filter((q) => {
        const filters = [];
        if (args.action) filters.push(q.eq(q.field("action"), args.action));
        if (matchingUserIds) filters.push(q.or(...matchingUserIds.map(id => q.eq(q.field("userId"), id))));
        else if (args.userId) filters.push(q.eq(q.field("userId"), args.userId));
        
        return filters.length > 0 ? q.and(...filters) : true;
      })
      .take(50);

    // Enrich logs with user details
    return Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", log.userId))
          .unique();

        return {
          ...log,
          performerName: profile ? `${profile.firstName} ${profile.lastName}` : user?.name || "Unknown User",
          performerEmail: user?.email,
        };
      })
    );
  },
});

export const logActivity = mutation({
  args: {
    action: v.string(),
    details: v.string(),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    await ctx.db.insert("activityLogs", {
      ...args,
      userId,
      timestamp: Date.now(),
    });
  },
});