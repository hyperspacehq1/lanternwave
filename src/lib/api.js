// src/lib/api.js
import { clipTypeFromKey } from "./ui.js";

const BASE = "/.netlify/functions";

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid JSON", raw: text };
  }
}

// Upload flow: create-upload-url -> PUT to R2 -> finish-upload
export async function uploadClip(file, onProgress) {
  const create = await jsonFetch(`${BASE}/create-upload-url`, {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type
    })
  });

  if (!create.ok) throw new Error(create.error || "Failed to create upload URL");

  const { uploadUrl, key, contentType } = create;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType || file.type || "application/octet-stream");

    xhr.upload.onprogress = (evt) => {
      if (!onProgress || !evt.lengthComputable) return;
      const pct = (evt.loaded / evt.total) * 100;
      onProgress(pct);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));

    xhr.send(file);
  });

  const check = await jsonFetch(`${BASE}/finish-upload`, {
    method: "POST",
    body: JSON.stringify({ key })
  });

  if (!check.ok) {
    throw new Error(check.error || "Upload verification failed");
  }

  return { key, type: clipTypeFromKey(key) };
}

export async function listClips() {
  const res = await jsonFetch(`${BASE}/list-clips`);
  if (!res.ok) throw new Error(res.error || "Failed to list clips");
  return res.items || [];
}

export async function deleteClip(key) {
  const url = `${BASE}/delete-clip?key=${encodeURIComponent(key)}`;
  const res = await jsonFetch(url);
  if (!res.ok) throw new Error(res.error || "Failed to delete clip");
  return res.deleted;
}

export function streamUrlForKey(key) {
  return `${BASE}/stream?key=${encodeURIComponent(key)}`;
}

export async function getNowPlaying() {
  const res = await jsonFetch(`${BASE}/now-playing`);
  if (!res.ok) throw new Error(res.error || "Failed to get now-playing");
  return res.nowPlaying;
}

export async function setNowPlaying(key) {
  const type = clipTypeFromKey(key);
  const res = await jsonFetch(`${BASE}/now-playing`, {
    method: "POST",
    body: JSON.stringify({ key, type })
  });
  if (!res.ok) throw new Error(res.error || "Failed to set now-playing");
  return res.nowPlaying;
}
