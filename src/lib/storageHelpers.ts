type StorageFileRef = {
  url?: unknown;
  path?: unknown;
  filename?: unknown;
};

export function getStorageUrl(fileRef: unknown): string | null {
  if (!fileRef) return null;
  if (typeof fileRef === "string") return fileRef;
  if (typeof fileRef === "object") {
    const ref = fileRef as StorageFileRef;
    // Common fields that might contain a URL or path in different environments
    if (typeof ref.url === "string") return ref.url;
    if (typeof ref.path === "string") return ref.path;
    if (typeof ref.filename === "string") return ref.filename;
  }
  return null;
}

export function getProfilePictureUrl(profilePictureUrl: string | null | undefined, profilePicture: unknown): string {
  if (profilePictureUrl) return profilePictureUrl;
  return getStorageUrl(profilePicture) || '/default-avatar.png';
}
