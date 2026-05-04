import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const numberWords: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
};

export function checkContentModeration(text: string): { isClean: boolean; reason?: string } {
  if (!text) return { isClean: true };

  // 1. Normalization
  let normalized = text.toLowerCase();
  
  // Convert number words to digits (e.g. "nine" -> "9")
  for (const [word, digit] of Object.entries(numberWords)) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    normalized = normalized.replace(regex, digit);
  }

  // Replace common obfuscations
  normalized = normalized.replace(/\bdot\b/g, '.').replace(/\bat\b/g, '@');
  normalized = normalized.replace(/\[dot\]/g, '.').replace(/\[at\]/g, '@');
  normalized = normalized.replace(/\(dot\)/g, '.').replace(/\(at\)/g, '@');
  
  // Remove all whitespace and common separators for strict pattern matching
  const stripped = normalized.replace(/[\s\-_()]/g, '');

  // 2. Pattern Detection
  
  // Email check
  const emailRegex = /[a-z0-9]+@[a-z0-9]+\.[a-z]{2,}/;
  if (emailRegex.test(stripped)) {
    return { isClean: false, reason: "Email addresses are not allowed." };
  }

  // Phone number check (at least 10 consecutive digits)
  const phoneRegex = /\d{10,}/;
  if (phoneRegex.test(stripped)) {
    return { isClean: false, reason: "Phone numbers are not allowed." };
  }

  // Keyword check
  const restrictedKeywords = ["whatsapp", "telegram", "instagram", "snapchat", "skype"];
  for (const keyword of restrictedKeywords) {
    if (stripped.includes(keyword)) {
      return { isClean: false, reason: "Sharing contact info or moving off-platform is not allowed." };
    }
  }

  // Exact phrase check on normalized (with spaces)
  if (normalized.includes("call me") || normalized.includes("dm me")) {
     return { isClean: false, reason: "Requests to contact off-platform are not allowed." };
  }

  return { isClean: true };
}

// Reusable function to enforce moderation and handle abuse logging
export async function enforceModeration(ctx: MutationCtx, userId: Id<"users">, text: string, context: string) {
  const moderationResult = checkContentModeration(text);
  
  if (!moderationResult.isClean) {
    // Log the violation in activityLogs
    await ctx.db.insert("activityLogs", {
      action: "Content Moderation Violation",
      details: `User attempted to share contact info in ${context}. Reason: ${moderationResult.reason}`,
      userId: userId,
      timestamp: Date.now(),
    });

    // Suspend or warn the user based on past violations
    const pastViolations = await ctx.db
      .query("activityLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("action"), "Content Moderation Violation"))
      .collect();

    if (pastViolations.length >= 3) {
       throw new Error(`Your message was blocked: ${moderationResult.reason}. Warning: Repeated violations may lead to account suspension.`);
    }

    throw new Error(`Your message was blocked: ${moderationResult.reason}`);
  }
}