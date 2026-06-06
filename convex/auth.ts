import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import { query } from "./_generated/server";
import { v } from "convex/values";

// Supported auth providers:
//   1. Password — email + password (existing accounts)
//   2. Google — OAuth 2.0 (Sign in with Google)
//
// Anonymous auth is intentionally disabled for production.
// To enable Google OAuth you must set these in Convex Dashboard → Settings → Environment Variables:
//   AUTH_GOOGLE_CLIENT_ID     — from Google Cloud Console
//   AUTH_GOOGLE_CLIENT_SECRET — from Google Cloud Console
//
// Callback URL to whitelist in Google Cloud Console:
//   https://<your-convex-site-url>/api/auth/callback/google
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Google],
});

export const loggedInUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      phone: v.optional(v.string()),
      phoneVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
