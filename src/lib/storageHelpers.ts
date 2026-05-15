export function getStorageUrl(fileRef: any): string | null {
  if (!fileRef) return null;
  if (typeof fileRef === "string") return fileRef;
  if (typeof fileRef === "object") {
    // Common fields that might contain a URL or path in different environments
    if (typeof fileRef.url === "string") return fileRef.url;
    if (typeof fileRef.path === "string") return fileRef.path;
    if (typeof (fileRef as any).filename === "string") return (fileRef as any).filename;
  }
  return null;
}

export function getProfilePictureUrl(profilePictureUrl: string | null | undefined, profilePicture: any): string {
  if (profilePictureUrl) return profilePictureUrl;
  return getStorageUrl(profilePicture) || '/default-avatar.png';
}