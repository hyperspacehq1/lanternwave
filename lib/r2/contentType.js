// lib/r2/contentType.js

export function guessContentType(name = "") {
  const lower = String(name).toLowerCase();

  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";

  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";

  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";

  return "application/octet-stream";
}

export function inferMediaType(key = "") {
  const lower = String(key).toLowerCase();

  if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".ogg"))
    return "audio";

  if (lower.endsWith(".mp4") || lower.endsWith(".webm")) return "video";

  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png"))
    return "image";

  return "unknown";
}
