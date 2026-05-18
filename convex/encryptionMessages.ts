import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getMessage = internalQuery({
  args: { messageId: v.id("messages") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("messages"),
      text: v.string(),
      isEncrypted: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) return null;
    return {
      _id: msg._id,
      text: msg.text,
      isEncrypted: msg.isEncrypted,
    };
  },
});

export const updateMessageText = internalMutation({
  args: {
    messageId: v.id("messages"),
    encryptedText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      text: args.encryptedText,
      isEncrypted: true,
    });
    return null;
  },
});
