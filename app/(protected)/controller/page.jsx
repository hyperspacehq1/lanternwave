"use client";

import React, { useEffect, useState, useRef } from "react";
import Header from "@/components/Header";
import "./controller.css";

// ===============================================
// Helper: Type detection from R2 keys
// ===============================================
function clipTypeFromKey(key) {
  const k = key.toLowerCase();
  if (k.endsWith(".mp3")) return "audio";
  if (k.endsWith(".mp4")) return "video";
  if (k.endsWith(".jpg") || k.endsWith(".jpeg") || k.endsWith(".png"))
    return "image";
  return "unknown";
}

function displayNameFromKey(key) {
  return key.replace(/^clips\//, "");
}

function streamUrlForKey(key) {
  return `/api/r2/stream?key=${encodeURIComponent(key)}`;
}

// ===============================================
// API WRAPPERS
// ===============================================
async function listClips() {
  const res = await fetch(`/api/r2/list`, { cache: "no-store" });
  const data = await res.json();
  return data.items || [];
}

async function deleteClip(key) {
  const res = await fetch(`/api/r2/delete?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

async function uploadClip(file, onProgress) {
  const urlRes = await fetch(`/api/r2/upload-url`, {
    method: "POST",
    body: JSON.stringify({ filename: file.name }),
    headers: { "Content-Type": "application/json" },
  });
  const { uploadUrl, key } = await urlRes.json();

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress((evt.loaded / evt.total) * 100);
      }
    };
    xhr.onload = resolve;
    xhr.onerror = reject;
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

  await fetch(`/api/r2/finalize`, {
    method: "POST",
    body: JSON.stringify({ key }),
    headers: { "Content-Type": "application/json" },
  });

  return { key };
}

async function getNowPlaying() {
  const res = await fetch(`/api/r2/now-playing`, { cache: "no-store" });
  const data = await res.json();
  return data.nowPlaying;
}

async function setNowPlaying(key) {
  const res = await fetch(`/api/r2/now-playing`, {
    method: "POST",
    body: JSON.stringify({ key }),
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  return data.nowPlaying;
}

// ===============================================
// Controller Page
// ===============================================
export default function ControllerPage() {
  const [clips, setClips] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [nowPlaying, setNowPlayingState] = useState(null);
  const [previewKey, setPreviewKey] = useState(null);
  const [loopEnabled, setLoopEnabled] = useState(false);

  const previewMediaRef = useRef(null);

  async function refreshClips() {
    setLoadingList(true);
    try {
      const items = await listClips();
      items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      setClips(items);
    } finally {
      setLoadingList(false);
    }
  }

  async function refreshNowPlaying() {
    const np = await getNowPlaying();
    if (np?.key) {
      const key = np.key.startsWith("clips/") ? np.key : `clips/${np.key}`;
      setNowPlayingState({ ...np, key });
      setPreviewKey(key);
    } else {
      setNowPlayingState(null);
      setPreviewKey(null);
    }
  }

  useEffect(() => {
    refreshClips();
    refreshNowPlaying();
  }, []);

  const previewUrl = previewKey ? streamUrlForKey(previewKey) : null;
  const previewType = previewKey ? clipTypeFromKey(previewKey) : null;

  return (
    <div className="lw-root">
      <Header />

      <main className="lw-main">
        <div className="lw-console">
          {/* UI PANELS (unchanged from your original) */}
        </div>
      </main>
    </div>
  );
}
