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
  const res = await jsonFetch(`${BASE}/delete-clip`, {
    method: "POST",
    body: JSON.stringify({ key }),
  });
  if (!res.ok) throw new Error(res.error || "Failed to delete clip");
  return res;
}

// -----------------------------------------
// UPLOAD CLIP
// -----------------------------------------
export async function uploadClip(file, onProgress) {
  const start = await jsonFetch(`${BASE}/create-upload-url`, {
    method: "POST",
    body: JSON.stringify({ filename: file.name }),
  });

  if (!start.ok) throw new Error(start.error || "Failed to request upload URL");

  await fetch(start.uploadUrl, {
    method: "PUT",
    body: file,
  });

  if (onProgress) onProgress(100);

  const finish = await jsonFetch(`${BASE}/finish-upload`, {
    method: "POST`,
    body: JSON.stringify({ key: start.key }),
  });

  if (!finish.ok) throw new Error(finish.error || "Failed to finalize upload");

  return { key: finish.key };
}

// -----------------------------------------
// NOW PLAYING  (STOP FIX APPLIED)
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
// STREAM URL
// -----------------------------------------
export function streamUrlForKey(key) {
  return `https://lanternwave-r2.hyperspacehq.com/${key}`;
}
