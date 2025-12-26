"use client";

import React, { useEffect, useState } from "react";
import { useGlobalAudio } from "@/components/GlobalAudio";
import "./controller.css";

/* ---------------- HELPERS ---------------- */

function clipTypeFromKey(key) {
  const k = key.toLowerCase();
  if (k.endsWith(".mp3")) return "audio";
  if (k.endsWith(".mp4")) return "video";
  if (k.endsWith(".jpg") || k.endsWith(".jpeg") || k.endsWith(".png"))
    return "image";
  return "unknown";
}

function displayNameFromKey(key) {
  return key.split("/").pop();
}

function streamUrlForKey(key) {
  return `/api/r2/stream?key=${encodeURIComponent(key)}`;
}

/* ---------------- API HELPERS ---------------- */

async function uploadClip(file, onProgress) {
  // 1. Request upload URL
  const init = await fetch("/api/r2/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, size: file.size }),
  });

  const initData = await init.json();
  if (!init.ok) throw new Error(initData.error || "Upload init failed");

  // 2. Upload to R2
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", initData.uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => resolve();
    xhr.onerror = reject;
    xhr.send(file);
  });

  // 3. Finalize
  const finalize = await fetch("/api/r2/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: initData.key }),
  });

  if (!finalize.ok) {
    throw new Error("Finalize failed");
  }
}

/* ---------------- COMPONENT ---------------- */

export default function ControllerPage() {
  const audio = useGlobalAudio();
  const [clips, setClips] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);

  async function refresh() {
    const res = await fetch("/api/r2/list");
    const data = await res.json();
    setClips(data.rows || []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleUpload(file) {
    setUploadProgress(0);
    setUploadError(null);

    try {
      await uploadClip(file, setUploadProgress);
      await refresh();
      setUploadProgress(null);
    } catch (err) {
      setUploadError(err.message);
    }
  }

  return (
    <div className="lw-console">
      <section className="lw-panel">
        <h2>UPLOAD</h2>

        <input
          type="file"
          onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
        />

        {uploadProgress !== null && (
          <div className="lw-progress-bar">
            <div
              className="lw-progress-bar-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {uploadError && <div className="lw-error">{uploadError}</div>}
      </section>

      <section className="lw-panel">
        <h2>CLIPS</h2>
        {clips.map((clip) => (
          <div key={clip.object_key} className="lw-clip-row">
            {clip.object_key}
          </div>
        ))}
      </section>
    </div>
  );
}
