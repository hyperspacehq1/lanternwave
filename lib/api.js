// lib/api.js
// Next.js App Router clip API wrapper (SERVER + CLIENT SAFE)

import { cookies } from "next/headers";

const BASE = "/api/r2";

async function jsonFetch(url, options = {}) {
  let headers = {
    ...(options?.body ? { "Content-Type": "application/json" } : {}),
    ...(options?.headers || {}),
  };

  // 🚨 SERVER COMPONENT FIX:
  // Forward incoming cookies explicitly
  try {
    const cookieStore = cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(c => `${c.name}=${c.value}`)
      .join("; ");

    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }
  } catch {
    // cookies() not available on client – safe to ignore
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return data;
}

// -----------------------------------------
// LIST CLIPS
// -----------------------------------------
export async function listClips() {
  const res = await jsonFetch(`${BASE}/list`, { method: "GET" });
  if (!res.ok) throw new Error(res.error || "Failed to list clips");
  return res.rows;
}

// -----------------------------------------
// DELETE CLIP
// -----------------------------------------
export async function deleteClip(key) {
  const res = await jsonFetch(`${BASE}/delete`, {
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
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filename", file.name);

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Upload failed");
  }

  if (onProgress) onProgress(100);
  return { key: data.key };
}

// -----------------------------------------
// NOW PLAYING
// -----------------------------------------
export async function setNowPlaying(key) {
  const res = await jsonFetch(`${BASE}/now-playing`, {
    method: "POST",
    body: JSON.stringify({ key }),
  });
  if (!res.ok) throw new Error(res.error || "Failed to set now playing");
  return res.nowPlaying;
}

export async function getNowPlaying() {
  const res = await jsonFetch(`${BASE}/now-playing`, { method: "GET" });
  if (!res.ok) return null;
  return res.nowPlaying;
}

// -----------------------------------------
// STREAM URL
// -----------------------------------------
export function streamUrlForKey(key) {
  const params = new URLSearchParams({ key });
  return `${BASE}/stream?${params.toString()}`;
}
