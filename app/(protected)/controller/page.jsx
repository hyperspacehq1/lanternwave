"use client";

import React, { useEffect, useState } from "react";
import { useGlobalAudio } from "@/components/GlobalAudio";
import "./controller.css";

/* ================================
   Helpers
================================ */
function clipTypeFromKey(key) {
  const k = key.toLowerCase();
  if (k.endsWith(".mp3")) return "audio";
  if (k.endsWith(".mp4")) return "video";
  if (k.endsWith(".jpg") || k.endsWith(".jpeg") || k.endsWith(".png"))
    return "image";
  return "unknown";
}

function displayNameFromKey(key) {
  const parts = key.split("/");
  return parts[parts.length - 1].replace(/^\d+-/, "");
}

function streamUrlForKey(key) {
  return `/api/r2/stream?key=${encodeURIComponent(key)}`;
}

/* ================================
   Image size enforcement (OPTION A)
================================ */
const MAX_IMAGE_DIMENSION = 2048;

function validateImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (
        img.width > MAX_IMAGE_DIMENSION ||
        img.height > MAX_IMAGE_DIMENSION
      ) {
        reject(
          new Error(
            "Your image is too large. Please compress it or resize dimensions to under 2048 × 2048 pixels before uploading."
          )
        );
      } else {
        resolve(true);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Invalid image file"));
    };

    img.src = objectUrl;
  });
}

/* ================================
   API helpers
================================ */
async function listClips() {
  const res = await fetch("/api/r2/list", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Not authenticated");
  const data = await res.json();
  return data.rows || [];
}

async function deleteClip(key) {
  const res = await fetch(`/api/r2/delete?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Delete failed");
}

async function uploadClip(file, onProgress) {
  const urlRes = await fetch("/api/r2/upload-url", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ filename: file.name, size: file.size }),
    headers: { "Content-Type": "application/json" },
  });

  const urlData = await urlRes.json().catch(() => null);

  if (!urlRes.ok || !urlData?.uploadUrl || !urlData?.key) {
    throw new Error(
      urlData?.error ||
        `Upload initialization failed (status ${urlRes.status})`
    );
  }

  const { uploadUrl, key } = urlData;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload to storage failed"));

    xhr.onerror = () => reject(new Error("Upload to storage failed"));

    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

  const finRes = await fetch("/api/r2/finalize", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ key }),
    headers: { "Content-Type": "application/json" },
  });

  if (!finRes.ok) throw new Error("Finalize failed");

  return key;
}

/* ================================
   Controller Page
================================ */
export default function ControllerPage() {
  const audio = useGlobalAudio();

  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [nowPlaying, setNowPlayingState] = useState(null);
  const [mediaFilter, setMediaFilter] = useState("all");

  const filteredClips = clips.filter((clip) =>
    mediaFilter === "all"
      ? true
      : clipTypeFromKey(clip.object_key) === mediaFilter
  );

  async function refresh() {
    setLoading(true);
    try {
      const rows = Array.isArray(await listClips())
        ? await listClips()
        : [];
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setClips(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="lw-main">
      <div className="lw-console">
        {/* Upload */}
        <section className="lw-panel">
          <h2 className="lw-panel-title">UPLOAD CLIP</h2>

          <label className={`lw-file-button ${loading ? "disabled" : ""}`}>
            SELECT FILE
            <input
              type="file"
              accept=".mp3,.mp4,.jpg,.jpeg,.png"
              disabled={loading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || loading) return;

                setUploadProgress(0);
                setUploadError(null);
                setLoading(true);

                try {
                  // ✅ Image size enforcement
                  if (file.type.startsWith("image/")) {
                    await validateImageDimensions(file);
                  }

                  await uploadClip(file, setUploadProgress);
                  setUploadProgress(null);
                  e.target.value = "";
                  await refresh();
                } catch (err) {
                  console.error("[upload]", err);
                  setUploadError(err?.message || "Upload failed");
                  setUploadProgress(null);
                } finally {
                  setLoading(false);
                }
              }}
            />
          </label>

          {uploadProgress !== null && (
            <div className="lw-upload-progress">
              <div
                className="lw-upload-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {uploadError && <div className="lw-upload-error">{uploadError}</div>}
        </section>
      </div>
    </div>
  );
}
