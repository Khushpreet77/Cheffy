// Client-side helper: compress + crop image to a square, return data URL.
export async function fileToCircularAvatarDataUrl(
  file: File,
  size = 320,
  quality = 0.85,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const src = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - src) / 2;
  const sy = (bitmap.height - src) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, sx, sy, src, src, 0, 0, size, size);
  bitmap.close?.();

  // Prefer WEBP, fallback to JPEG
  const supportsWebp = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  const mime = supportsWebp ? "image/webp" : "image/jpeg";
  return canvas.toDataURL(mime, quality);
}
