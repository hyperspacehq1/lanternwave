// src/lib/ui.js

// -----------------------------------------
// NULL-SAFE TYPE DETECTION  (STOP FIX)
// -----------------------------------------
export function clipTypeFromKey(key = "") {
  // FIX: Prevent .toLowerCase() on null
  if (typeof key !== "string") return "unknown";

  const lower = key.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio";
  if (lower.endsWith(".mp4")) return "video";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png"))
    return "image";

  return "unknown";
}

// -----------------------------------------
export function displayNameFromKey(key = "") {
  if (typeof key !== "string") return "";
  return key.replace(/^clips\//, "");
}
