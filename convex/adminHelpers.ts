import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const checkIsAdminById = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile || profile.isAdmin !== true) {
      return false;
    }
    
    return true;
  },
});