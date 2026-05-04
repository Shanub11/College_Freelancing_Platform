/**
 * Compresses an image file locally in the browser before upload.
 * If the file is not an image (e.g., PDF), it returns the original file.
 */
export const compressImage = async (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<File> => {
  if (!file.type.startsWith("image/")) {
    return file; // Skip compression for PDFs or non-image files
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        return resolve(file); // Fallback to original
      }

      let { width, height } = img;
      if (width > height && width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      } else if (height > maxHeight) {
        width = Math.round(width * (maxHeight / height));
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (blob) {
          resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
        } else {
          resolve(file); // Fallback
        }
      }, "image/jpeg", quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Fallback to original on error
    };
  });
};