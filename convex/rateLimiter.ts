import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Plain TypeScript helper to check limits inside an existing mutation.
 * Will throw an error if the user has exceeded `maxCount` within `windowMs`.
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
  
  const recent = await ctx.db
    .query("activityLogs")
    .withIndex("by_user_and_action", (q) => q.eq("userId", userId).eq("action", action))
    .filter((q) => q.gte(q.field("_creationTime"), windowStart))
    .collect();
  
  if (recent.length >= maxCount) {
    throw new Error(errorMessage);
  }
  
  await ctx.db.insert("activityLogs", {
    action,
    details: `Rate limit check passed: ${action}`,
    userId,
    timestamp: Date.now(),
  });
}