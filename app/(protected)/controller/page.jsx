"use client";

import React, { useEffect, useState, useRef } from "react";
import "./controller.css";

// ===============================================
// Helpers
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
  return key.replace(/^tenants\/[^/]+\/clips\//, "");
}

function streamUrlForKey(key) {
  return `/api/r2/stream?key=${encodeURIComponent(key)}`;
}

// ===============================================
// API helpers
// ===============================================
async function listClips() {
  const res = await fetch(`/api/r2/list`, { cache: "no-store" });
  const data = await res.json();
  return data.items || [];
}

async function deleteClip(key) {
  const res = await fetch(
    `/api/r2/delete?key=${encodeURIComponent(key)}`,
    { method: "DELETE" }
  );
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

  const previewMediaRef = useRef(null);

  async function refreshClips() {
    setLoadingList(true);
    try {
      const items = await listClips();
      items.sort(
        (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
      );
      setClips(items);
    } finally {
      setLoadingList(false);
    }
  }

  async function refreshNowPlaying() {
    const np = await getNowPlaying();
    if (np?.key) {
      setNowPlayingState(np);
      setPreviewKey(np.key);
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
    <div className="lw-console">
      {/* Upload Panel */}
      <section className="lw-panel">
        <h2 className="lw-panel-title">UPLOAD CLIP</h2>

        <label className="lw-file-button">
          <span>SELECT FILE</span>
          <input
            type="file"
            accept=".mp3,.mp4,.jpg,.jpeg,.png"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              setUploadProgress(0);
              setUploadMessage("");

              try {
                const res = await uploadClip(file, (pct) =>
                  setUploadProgress(pct)
                );
                setUploadMessage("Upload complete.");
                await refreshClips();
                setPreviewKey(res.key);
              } catch {
                setUploadMessage("Upload error.");
              } finally {
                e.target.value = "";
                setTimeout(() => setUploadProgress(null), 1500);
              }
            }}
          />
        </label>

        {uploadProgress !== null && (
          <div className="lw-progress-wrap">
            <div className="lw-progress-bar">
              <div
                className="lw-progress-bar-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="lw-progress-text">
              {uploadProgress.toFixed(0)}%
            </span>
          </div>
        )}

        {uploadMessage && (
          <div className="lw-status-line">{uploadMessage}</div>
        )}
        {deleteMessage && (
          <div className="lw-status-line">{deleteMessage}</div>
        )}
      </section>

      {/* Clip Library */}
      <section className="lw-panel">
        <h2 className="lw-panel-title">CLIP LIBRARY</h2>

        {loadingList && (
          <div className="lw-status-line">Loading…</div>
        )}

        <div className="lw-clip-list">
          {clips.length === 0 && !loadingList && (
            <div className="lw-status-line">No clips found.</div>
          )}

          {clips.map((clip) => {
            const type = clipTypeFromKey(clip.key);
            const isNow = nowPlaying?.key === clip.key;

            return (
              <div
                key={clip.key}
                className={`lw-clip-row ${
                  isNow ? "lw-clip-row-active" : ""
                }`}
              >
                <div className="lw-clip-main">
                  <span className="lw-clip-type">
                    {type.toUpperCase()}
                  </span>
                  <span className="lw-clip-name">
                    {displayNameFromKey(clip.key)}
                  </span>
                </div>

                <div className="lw-clip-actions">
                  <button
                    className="lw-btn"
                    onClick={async () => {
                      const np = await setNowPlaying(clip.key);
                      setNowPlayingState(np);
                      setPreviewKey(clip.key);
                    }}
                  >
                    PLAY
                  </button>

                  <button
                    className="lw-btn"
                    onClick={async () => {
                      if (previewMediaRef.current) {
                        previewMediaRef.current.pause();
                        previewMediaRef.current.removeAttribute("src");
                        previewMediaRef.current.load();
                      }
                      await setNowPlaying(null);
                      setNowPlayingState(null);
                      setPreviewKey(null);
                    }}
                  >
                    STOP
                  </button>

                  <button
                    className="lw-btn lw-btn-danger"
                    onClick={async () => {
                      await deleteClip(clip.key);
                      setDeleteMessage("Clip deleted.");
                      await refreshClips();
                    }}
                  >
                    DELETE
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Preview */}
      <section className="lw-panel">
        <h2 className="lw-panel-title">AUDIENCE PREVIEW</h2>

        <div className="lw-preview-frame">
          {!previewUrl && (
            <div className="lw-preview-placeholder">NO CLIP</div>
          )}

          {previewUrl && previewType === "image" && (
            <img
              src={previewUrl}
              className="lw-preview-media"
              alt="preview"
            />
          )}

          {previewUrl && previewType === "audio" && (
            <audio
              ref={previewMediaRef}
              src={previewUrl}
              autoPlay
              controls
            />
          )}

          {previewUrl && previewType === "video" && (
            <video
              ref={previewMediaRef}
              className="lw-preview-media"
              src={previewUrl}
              autoPlay
              controls
            />
          )}
        </div>
      </section>
    </div>
  );
}
