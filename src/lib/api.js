// src/lib/api.js
import { clipTypeFromKey } from "./ui.js";

const BASE = "/.netlify/functions";

// Safe JSON fetch
async function jsonFetch(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let text = await res.text();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("JSON parse failed:", text);
    console.error("Raw response:", text);
    return { ok: false, error: "Invalid JSON from server" };
  }
}

// -----------------------------------------
// LIST CLIPS
// -----------------------------------------
export async function listClips() {
  const res = await jsonFetch(`${BASE}/list-clips`, { method: "GET" });
  if (!res.ok) throw new Error(res.error || "Failed to list clips");
  return res.items;
}

// -----------------------------------------
// DELETE CLIP
// -----------------------------------------
export async function deleteClip(key) {
  if (!key) throw new Error("Missing key for deleteClip");

  const res = await jsonFetch(`${BASE}/delete-clip`, {
    method: "POST",
    body: JSON.stringify({ key }),
  });

  if (!res.ok) throw new Error(res.error || "Failed to delete clip");
  return res;
}

// -----------------------------------------
// UPLOAD CLIP (Create URL → PUT to R2 → finalize)
// -----------------------------------------
export async function uploadClip(file, onProgress) {
  // STEP 1: Request presigned URL
  const start = await jsonFetch(`${BASE}/create-upload-url`, {
    method: "POST",
    body: JSON.stringify({ filename: file.name }),
  });

  if (!start.ok) throw new Error(start.error || "Failed to request upload URL");

  // STEP 2: Upload actual file to R2
  await fetch(start.uploadUrl, {
    method: "PUT",
    body: file,
  });

  if (onProgress) onProgress(100);

  // STEP 3: Finalize
  const finish = await jsonFetch(`${BASE}/finish-upload`, {
    method: "POST",
    body: JSON.stringify({ key: start.key }),
  });

  if (!finish.ok) throw new Error(finish.error || "Failed to finalize upload");

  return { key: finish.key };
}

// -----------------------------------------
// SET NOW PLAYING
// -----------------------------------------
export async function setNowPlaying(key) {
  const type = key ? clipTypeFromKey(key) : null;

  const res = await jsonFetch(`${BASE}/now-playing`, {
    method: "POST",
    body: JSON.stringify({ key, type }),
  });

  if (!res.ok) throw new Error(res.error || "Failed to set now-playing");
  return res.nowPlaying;
}

// -----------------------------------------
// GET NOW PLAYING
// -----------------------------------------
export async function getNowPlaying() {
  const res = await jsonFetch(`${BASE}/now-playing`, {
    method: "GET",
  });

  if (!res.ok) throw new Error(res.error || "Failed to get now-playing");
  return res.nowPlaying;
}

// -----------------------------------------
// STREAM URL  (FIXED — matches your Cloudflare R2 bucket)
// -----------------------------------------
export function streamUrlForKey(key) {
  if (!key) return "";
  return `https://f15ba1de2141b3d2d51467df1cb1e32e.r2.cloudflarestorage.com/lanternwave/${key}`;
}
