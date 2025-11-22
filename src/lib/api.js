// src/lib/api.js
import { clipTypeFromKey } from "./ui.js";

// CHANGE THIS to your Netlify function base:
const BASE = "/.netlify/functions";

async function jsonFetch(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  return data;
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
  const res = await jsonFetch(`${BASE}/delete-clip`, {
    method: "POST",
    body: JSON.stringify({ key }),
  });
  if (!res.ok) throw new Error(res.error || "Failed to delete clip");
  return res;
}

// -----------------------------------------
// UPLOAD CLIP — STAGED R2 MULTIPART
// -----------------------------------------
export async function uploadClip(file, onProgress) {
  // STEP 1: Create upload URL
  const start = await jsonFetch(`${BASE}/create-upload-url`, {
    method: "POST",
    body: JSON.stringify({ filename: file.name }),
  });

  if (!start.ok) throw new Error(start.error || "Failed to request upload URL");

  // STEP 2: Upload actual file to presigned URL
  await fetch(start.uploadUrl, {
    method: "PUT",
    body: file,
  });

  if (onProgress) onProgress(100);

  // STEP 3: Finalize upload
  const finish = await jsonFetch(`${BASE}/finish-upload`, {
    method: "POST",
    body: JSON.stringify({ key: start.key }),
  });

  if (!finish.ok) throw new Error(finish.error || "Failed to finalize upload");
  return { key: finish.key };
}

// -----------------------------------------
// SET NOW PLAYING  (STOP FIX APPLIED)
// -----------------------------------------
export async function setNowPlaying(key) {
  // FIX: Only compute type if key is a real string
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
// STREAM URL (R2 PUBLIC URL)
// -----------------------------------------
export function streamUrlForKey(key) {
  const base = "https://f15ba1de2141b3d2d51467df1cb1e32e.r2.cloudflarestorage.com/lanternwave";
  return `${base}/${key}`;
}`;
}
