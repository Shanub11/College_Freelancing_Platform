import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ─── Number word normalization ───────────────────────────────────────────────

const numberWords: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
};

// ─── Normalization helpers ────────────────────────────────────────────────────

/**
 * Normalize text for pattern matching:
 * - Lowercase
 * - Replace number words with digits
 * - Replace common obfuscation patterns
 * - Remove zero-width and invisible Unicode characters
 * - Normalize lookalike characters (e.g. @ lookalikes → @)
 */
function normalizeForDetection(text: string): string {
  let t = text.toLowerCase();

  // Remove zero-width characters and invisible Unicode
  // eslint-disable-next-line no-control-regex
  t = t.replace(/[\u200b\u200c\u200d\u2060\ufeff\u00ad]/g, "");

  // Replace number words with digits
  for (const [word, digit] of Object.entries(numberWords)) {
    t = t.replace(new RegExp(`\\b${word}\\b`, "g"), digit);
  }

  // Replace common text obfuscations for email/phone
  t = t
    .replace(/\[dot\]|\(dot\)/g, ".")
    .replace(/\bdot\b/g, ".")
    .replace(/\[at\]|\(at\)/g, "@")
    .replace(/\bat\b/g, "@")
    .replace(/\[dash\]|\(dash\)/g, "-");

  // Normalize @ lookalikes (Unicode characters that look like @)
  t = t.replace(/[\uff20]/g, "@");

  // Normalize . lookalikes
  t = t.replace(/[\u2024\u0387]/g, ".");

  return t;
}

/**
 * Strip all separators for dense pattern matching 
 * (catches "98 765 43210", "98-765-43210", "98.765.43210").
 */
function stripSeparators(text: string): string {
  return text.replace(/[\s\-_.,()\[\]]/g, "");
}

// ─── Detection patterns ───────────────────────────────────────────────────────

// Email detection — catches obfuscated variants
const EMAIL_PATTERNS = [
  /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/,          // Standard
  /[a-z0-9._%+\-]+\s*@\s*[a-z0-9.\-]+\s*\.\s*[a-z]{2,}/, // Spaced
];

// Phone detection — Indian and international formats
// Catches 10+ consecutive digits after stripping separators
const PHONE_PATTERN = /\d{10,}/;

// Indian phone with country code (+91 followed by 10 digits)
const INDIA_PHONE_PATTERN = /(\+91|0091|91)[\s\-]?[6-9]\d{9}/;

// WhatsApp/Telegram number sharing patterns
const WHATSAPP_PATTERNS = [
  /wa\.me\/\d+/,
  /whatsapp\.com/,
  /whatsapp\s*(?:number|no|num|id)/,
];

// Off-platform contact keywords (comprehensive list)
const CONTACT_KEYWORDS = [
  "whatsapp", "telegram", "instagram", "snapchat", "skype",
  "discord", "signal", "wechat", "line app", "viber",
  "facebook messenger", "fb messenger",
  "t.me/", "wa.me/",
  "call me", "dm me", "text me", "ping me",
  "reach me", "contact me outside", "message me on",
  "my number is", "my phone is", "give me a call",
  "add me on", "find me on",
];

// URL patterns for off-platform communication
const SOCIAL_URL_PATTERNS = [
  /instagram\.com\/[a-z0-9_.]+/,
  /t\.me\/[a-z0-9_]+/,
  /discord\.gg\/[a-z0-9]+/,
];

// ─── Core detection function ──────────────────────────────────────────────────

export function checkContentModeration(
  text: string
): { isClean: boolean; reason?: string } {
  if (!text || text.trim().length === 0) return { isClean: true };

  const normalized = normalizeForDetection(text);
  const stripped = stripSeparators(normalized);

  // 1. Email check
  for (const pattern of EMAIL_PATTERNS) {
    if (pattern.test(normalized)) {
      return { isClean: false, reason: "Email addresses are not allowed." };
    }
  }

  // 2. Phone number checks
  if (PHONE_PATTERN.test(stripped)) {
    return {
      isClean: false,
      reason: "Phone numbers are not allowed.",
    };
  }

  if (INDIA_PHONE_PATTERN.test(stripped)) {
    return {
      isClean: false,
      reason: "Phone numbers are not allowed.",
    };
  }

  // 3. WhatsApp specific patterns
  for (const pattern of WHATSAPP_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isClean: false,
        reason: "Sharing contact info or moving off-platform is not allowed.",
      };
    }
  }

  // 4. Social media URL patterns
  for (const pattern of SOCIAL_URL_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isClean: false,
        reason: "Sharing external profile links is not allowed.",
      };
    }
  }

  // 5. Contact keyword check (on normalized text with separators)
  for (const keyword of CONTACT_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return {
        isClean: false,
        reason: "Requests to contact off-platform are not allowed.",
      };
    }
  }

  return { isClean: true };
}

// ─── Multi-field helper ───────────────────────────────────────────────────────

export function checkMultipleFields(
  fields: Array<{ fieldName: string; value: string }>
): { fieldName: string; reason: string } | null {
  for (const field of fields) {
    if (!field.value) continue;
    const result = checkContentModeration(field.value);
    if (!result.isClean) {
      return {
        fieldName: field.fieldName,
        reason: result.reason || "Content not allowed",
      };
    }
  }
  return null;
}

// ─── Enforcement helpers ──────────────────────────────────────────────────────

export async function enforceModeration(
  ctx: MutationCtx,
  userId: Id<"users">,
  text: string,
  context: string,
  additionalFields?: Array<{ fieldName: string; value: string }>
): Promise<void> {
  const moderationResult = checkContentModeration(text);

  if (!moderationResult.isClean) {
    await ctx.db.insert("activityLogs", {
      action: "Content Moderation Violation",
      details:
        `User attempted to share contact info in ${context}. ` +
        `Reason: ${moderationResult.reason}`,
      userId,
      timestamp: Date.now(),
    });

    const pastViolations = await ctx.db
      .query("activityLogs")
      .withIndex("by_user_and_action", (q) =>
        q.eq("userId", userId).eq("action", "Content Moderation Violation")
      )
      .collect();

    if (pastViolations.length >= 3) {
      throw new Error(
        `Your message was blocked: ${moderationResult.reason}. ` +
        `Warning: Repeated violations may lead to account suspension.`
      );
    }

    throw new Error(`Your message was blocked: ${moderationResult.reason}`);
  }

  if (additionalFields) {
    const violation = checkMultipleFields(additionalFields);
    if (violation) {
      await ctx.db.insert("activityLogs", {
        action: "Content Moderation Violation",
        details:
          `User attempted to add contact info in ${violation.fieldName} ` +
          `in ${context}. Reason: ${violation.reason}`,
        userId,
        timestamp: Date.now(),
      });
      throw new Error(
        `Your ${violation.fieldName} contains content that is not allowed: ` +
        violation.reason
      );
    }
  }
}

export async function enforceModerationOnFields(
  ctx: MutationCtx,
  userId: Id<"users">,
  fields: Array<{ fieldName: string; value: string }>
): Promise<void> {
  const violation = checkMultipleFields(fields);
  if (!violation) return;

  await ctx.db.insert("activityLogs", {
    action: "Content Moderation Violation",
    details:
      `User attempted to share contact info in ${violation.fieldName}. ` +
      `Reason: ${violation.reason}`,
    userId,
    timestamp: Date.now(),
  });

  throw new Error(
    `Your ${violation.fieldName} contains content that is not allowed: ` +
    violation.reason
  );
}