"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { encrypt, decrypt } from "./lib/encryption";
import { internal as internalApi } from "./_generated/api";

const internal = internalApi as any;

export const encryptText = internalAction({
  args: { text: v.string() },
  returns: v.string(),
  handler: async (_ctx, args) => {
    return encrypt(args.text);
  },
});

export const decryptText = internalAction({
  args: { text: v.string() },
  returns: v.string(),
  handler: async (_ctx, args) => {
    return decrypt(args.text);
  },
});

export const encryptStoredMessage = internalAction({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.runQuery(
      internal.encryptionMessages.getMessage,
      { messageId: args.messageId }
    );

    if (!message || message.isEncrypted) {
      return null;
    }

    const encryptedText = encrypt(message.text);

    await ctx.runMutation(
      internal.encryptionMessages.updateMessageText,
      { messageId: args.messageId, encryptedText }
    );

    return null;
  },
});
