import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";

export type UploadCategory = "profile_image" | "gig_image" | "verification_doc";

interface UseImageUploadOptions {
  category: UploadCategory;
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  onSuccess?: (storageId: string) => void;
  onError?: (error: string) => void;
}

/**
 * Shared hook for uploading images to Convex storage.
 * Reused by profile picture flow, gig image uploads, etc.
 */
export function useImageUpload({
  category,
  maxSizeMB = 5,
  maxWidth = 1200,
  maxHeight = 900,
  quality = 0.8,
  onSuccess,
  onError,
}: UseImageUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation((api as any).profiles.generateUploadUrl);
  const validateUpload = useMutation(api.storage.validateUpload);

  const uploadFile = async (file: File): Promise<string | null> => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const msg = `File must be smaller than ${maxSizeMB}MB.`;
      toast.error(msg);
      onError?.(msg);
      return null;
    }

    setIsUploading(true);
    // Show local preview immediately
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const compressed = await compressImage(file, maxWidth, maxHeight, quality);
      const postUrl = await generateUploadUrl();
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": compressed.type },
        body: compressed,
      });
      const { storageId } = await res.json();
      const validatedId = await validateUpload({ storageId, category });
      onSuccess?.(validatedId);
      return validatedId;
    } catch (err: any) {
      const msg = err.message || "Upload failed. Please try again.";
      toast.error(msg);
      onError?.(msg);
      setPreviewUrl(null);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";
  };

  const openFilePicker = () => fileInputRef.current?.click();

  return {
    fileInputRef,
    isUploading,
    previewUrl,
    handleFileChange,
    openFilePicker,
    uploadFile,
  };
}
