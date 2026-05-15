import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Enforces a rate limit for a specific action by a specific user.
 * 
 * Uses the "timestamp" field (not _creationTime) for time windowing because:
 * 1. "timestamp" is explicitly stored and accurate
 * 2. We filter after the index lookup using the stored timestamp
 * 
 * HOW IT WORKS:
 * - Queries activityLogs by userId + action (using the existing index)
 * - Filters to only entries within the time window using timestamp field
 * - If count >= maxCount, throws errorMessage
 * - Otherwise inserts a new log entry to count this attempt
 * 
 * NOTE: The rate limit log entries use a prefixed action name (e.g. 
 * "ratelimit:message_send") so they don't mix with real activity logs.
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  maxCount: number,
  windowMs: number,
  errorMessage: string
): Promise<void> {
  const windowStart = Date.now() - windowMs;
  
  // Use a prefixed action name so rate limit logs don't pollute activity logs
  const rateLimitAction = `ratelimit:${action}`;

  // Query by index first (fast), then filter by timestamp (explicit field)
  const recent = await ctx.db
    .query("activityLogs")
    .withIndex("by_user_and_action", (q) => 
      q.eq("userId", userId).eq("action", rateLimitAction)
    )
    .filter((q) => q.gte(q.field("timestamp"), windowStart))
    .collect();
  
  if (recent.length >= maxCount) {
    throw new Error(errorMessage);
  }
  
  // Record this attempt so future checks count it
  await ctx.db.insert("activityLogs", {
    action: rateLimitAction,
    details: `Rate limit check for: ${action}`,
    userId,
    timestamp: Date.now(),
  });
}