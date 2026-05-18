import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Enforces a rate limit for a specific action by a specific user.
 *
 * Uses a dedicated `rateLimits` table instead of `activityLogs` so that:
 * 1. Admin activity logs are not polluted with rate limit records.
 * 2. Rate limit lookups only scan the small rateLimits table.
 * 3. Old tokens outside the time window are cleaned up automatically.
 *
 * HOW IT WORKS:
 * - Deletes all expired tokens for this user+action (cleanup).
 * - Counts remaining tokens within the current window.
 * - If count >= maxCount, throws errorMessage
 * - Otherwise inserts a new log entry to count this attempt
 *
 * This runs inside a Convex mutation which is serialized per-document,
 * making it safe from race conditions for the same user+action pair.
 *
 * @param ctx        - Convex MutationCtx
 * @param userId     - The user being rate limited
 * @param action     - Short identifier e.g. "message_send", "gig_create"
 * @param maxCount   - Max allowed calls within windowMs
 * @param windowMs   - Time window in milliseconds
 * @param errorMessage - Error thrown when limit is exceeded
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  maxCount: number,
  windowMs: number,
  errorMessage: string
): Promise<void> {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Step 1: Delete expired tokens for this user+action to keep table small.
  // We fetch them first, then delete individually (Convex has no bulk delete).
  const expiredTokens = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_and_action", (q) =>
      q.eq("userId", userId).eq("action", action)
    )
    .filter((q) => q.lt(q.field("timestamp"), windowStart))
    .collect();

  for (const token of expiredTokens) {
    await ctx.db.delete(token._id);
  }

  // Step 2: Count active tokens within the current window.
  const activeTokens = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_and_action", (q) =>
      q.eq("userId", userId).eq("action", action)
    )
    .filter((q) => q.gte(q.field("timestamp"), windowStart))
    .collect();
  
  if (activeTokens.length >= maxCount) {
    throw new Error(errorMessage);
  }
  
  // Step 3: Insert a new token to record this attempt.
  await ctx.db.insert("rateLimits", {
    userId,
    action,
    timestamp: now,
  });
}

/**
 * Returns how many rate limit tokens a user has consumed for an action
 * within the current window. Useful for showing "X of Y attempts used".
 * Call from a query (read-only). Does NOT clean up expired tokens.
 */
export async function getRateLimitCount(
  ctx: { db: MutationCtx["db"] },
  userId: Id<"users">,
  action: string,
  windowMs: number
): Promise<number> {
  const windowStart = Date.now() - windowMs;

  const activeTokens = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_and_action", (q) =>
      q.eq("userId", userId).eq("action", action)
    )
    .filter((q) => q.gte(q.field("timestamp"), windowStart))
    .collect();

  return activeTokens.length;
}