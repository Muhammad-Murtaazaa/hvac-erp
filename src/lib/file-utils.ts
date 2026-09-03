/**
 * Utility functions for handling file URLs safely across the browser and server.
 */

export function getFileViewUrl(fileUrl: string | null | undefined): string {
  if (!fileUrl) return "";
  
  // Remote URLs (e.g. AWS S3, Cloudinary) can be returned as is
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  // Local uploads (e.g. /uploads/17253-filename#1.pdf):
  // Preserve leading slash, and safely encode URL segments so characters like '#' or '?'
  // don't get treated as browser anchor fragments or query delimiters.
  return fileUrl
    .split("/")
    .map((segment) => {
      if (!segment) return "";
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}
