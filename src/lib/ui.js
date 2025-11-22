// src/lib/ui.js
eexport function clipTypeFromKey(key = "") {
  if (typeof key !== "string") return "unknown";   // ← ADD THIS
  const lower = key.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio";
  if (lower.endsWith(".mp4")) return "video";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png"))
    return "image";
  return "unknown";
}

export function displayNameFromKey(key = "") {
  // Remove R2 folder prefix
  let name = key.replace(/^clips\//, "");

  // If key is timestamp-prefixed like "1763685678217-faded_castle323.jpg"
  // strip the leading long number + dash.
  const match = name.match(/^(\d{10,})-(.+)$/);
  if (match) {
    return match[2];
  }

  return name;
}
