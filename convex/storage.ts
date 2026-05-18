import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// File size limits in bytes
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB
const MAX_CHAT_ATTACHMENT_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_VERIFICATION_DOC_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_GIG_IMAGE_SIZE = 5 * 1024 * 1024;         // 5MB

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const ALLOWED_CHAT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

type FileCategory = "profile_image" | "chat_attachment" | "verification_doc" | "gig_image";

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Call this mutation AFTER uploading a file to validate it server-side.
 * Pass the storageId returned by the upload and the category of file.
 * If validation fails, the file is deleted from storage and an error is thrown.
 * If validation passes, returns the storageId so you can save it to your document.
 *
 * Usage in frontend:
 *   const storageId = uploadResult.storageId;
 *   const validatedId = await validateUpload({ storageId, category: "profile_image" });
 *   // Now save validatedId to your profile/gig/etc.
 */
export const validateUpload = mutation({
  args: {
    storageId: v.id("_storage"),
    category: v.union(
      v.literal("profile_image"),
      v.literal("chat_attachment"),
      v.literal("verification_doc"),
      v.literal("gig_image")
    ),
  },
  returns: v.id("_storage"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Read metadata from Convex storage system table
    const metadata = await ctx.db.system.get(args.storageId);

    if (!metadata) {
      throw new Error("File not found in storage. Upload may have failed.");
    }

    const contentType = metadata.contentType ?? "";
    const fileSize = metadata.size ?? 0;

    let maxSize: number;
    let allowedTypes: string[];

    switch (args.category) {
      case "profile_image":
        maxSize = MAX_PROFILE_IMAGE_SIZE;
        allowedTypes = ALLOWED_IMAGE_TYPES;
        break;
      case "chat_attachment":
        maxSize = MAX_CHAT_ATTACHMENT_SIZE;
        allowedTypes = ALLOWED_CHAT_TYPES;
        break;
      case "verification_doc":
        maxSize = MAX_VERIFICATION_DOC_SIZE;
        allowedTypes = ALLOWED_DOCUMENT_TYPES;
        break;
      case "gig_image":
        maxSize = MAX_GIG_IMAGE_SIZE;
        allowedTypes = ALLOWED_IMAGE_TYPES;
        break;
      default:
        await ctx.storage.delete(args.storageId);
        throw new Error("Unknown file category");
    }

    // Check file type
    if (!allowedTypes.includes(contentType)) {
      // Delete the invalid file from storage immediately
      await ctx.storage.delete(args.storageId);
      throw new Error(
        `Invalid file type "${contentType}". ` +
        `Allowed types for ${args.category}: ${allowedTypes.join(", ")}`
      );
    }

    // Check file size
    if (fileSize > maxSize) {
      // Delete the oversized file from storage immediately
      await ctx.storage.delete(args.storageId);
      throw new Error(
        `File size ${(fileSize / 1024 / 1024).toFixed(1)}MB exceeds ` +
        `the ${(maxSize / 1024 / 1024).toFixed(0)}MB limit for ${args.category}`
      );
    }

    // Validation passed — return the storageId for saving
    return args.storageId;
  },
});

/**
 * Deletes a file from storage. Only the authenticated user can call this.
 * Use this to clean up files if the user cancels an upload flow mid-way.
 */
export const deleteFile = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.storage.delete(args.storageId);
    return null;
  },
});
