"use client";

import React, { useEffect, useState } from "react";
import { useGlobalAudio } from "@/components/GlobalAudio";
import "./controller.css";

/* ================================
   Helpers
================================ */
function clipTypeFromKey(key = "") {
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
    throw new Error(urlData?.error || "Upload init failed");
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
        : reject(new Error("Upload failed"));

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

  await fetch("/api/r2/finalize", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ key }),
    headers: { "Content-Type": "application/json" },
  });

  return key;
}

async function getNowPlaying() {
  const res = await fetch("/api/r2/now-playing", {
    cache: "no-store",
    credentials: "include",
  });
  const data = await res.json();
  return data.nowPlaying || null;
}

async function setNowPlaying(key) {
  const res = await fetch("/api/r2/now-playing", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ key }),
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  return data.nowPlaying || null;
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

  async function refresh() {
    setLoading(true);
    try {
      const rows = await listClips();
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setClips(rows);
      setNowPlayingState(await getNowPlaying());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  /* =========================================================
     SINGLE SOURCE OF TRUTH
     ========================================================= */
  const playingKey = nowPlaying?.key || null;
  const playingType = playingKey ? clipTypeFromKey(playingKey) : null;

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <div className="lw-main">
      <div className="lw-console">

        {/* ================= Upload ================= */}
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
                if (!file) return;

                setUploadProgress(0);
                setUploadError(null);
                setLoading(true);

                try {
                  await uploadClip(file, setUploadProgress);
                  setUploadProgress(null);
                  e.target.value = "";
                  await refresh();
                } catch (err) {
                  setUploadError(err.message);
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

        {/* ================= Library ================= */}
        <section className="lw-panel">
          <h2 className="lw-panel-title">CLIP LIBRARY</h2>

          <div className="lw-clip-list">
            {clips.map((clip) => {
              const key = clip.object_key;
              const isActive = playingKey === key;

              return (
                <div
                  key={key}
                  className={`lw-clip-row ${isActive ? "lw-clip-row-active" : ""}`}
                >
                  <div className="lw-clip-main">
                    <span className="lw-clip-type">
                      {clipTypeFromKey(key).toUpperCase()}
                    </span>
                    <span className="lw-clip-name">
                      {displayNameFromKey(key)}
                    </span>
                  </div>

                  <div className="lw-clip-actions">
                    <button
                      className="lw-btn"
                      disabled={busyKey === key}
                      onClick={async () => {
                        setBusyKey(key);
                        try {
                          const np = await setNowPlaying(key);
                          setNowPlayingState(np);

                          const type = clipTypeFromKey(key);

                          // 🔑 AUDIO ONLY
                          if (type === "audio") {
                            audio.stop();
                            audio.play(streamUrlForKey(key), key);
                          } else {
                            audio.stop();
                          }
                        } finally {
                          setBusyKey(null);
                        }
                      }}
                    >
                      PLAY
                    </button>

                    <button
                      className="lw-btn"
                      onClick={async () => {
                        await setNowPlaying(null);
                        setNowPlayingState(null);
                        audio.stop();
                      }}
                    >
                      STOP
                    </button>

                    <button
                      className="lw-btn lw-btn-danger"
                      onClick={async () => {
                        await deleteClip(key);
                        await refresh();
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

        {/* ================= Preview ================= */}
        <section className="lw-panel">
          <h2 className="lw-panel-title">AUDIENCE PREVIEW</h2>

          <div className="lw-preview-frame">
            {!playingKey && <div className="lw-preview-placeholder">NO CLIP</div>}

            {playingKey && playingType === "image" && (
              <img
                src={streamUrlForKey(playingKey)}
                className="lw-preview-media"
              />
            )}

            {playingKey && playingType === "video" && (
              <video
                src={streamUrlForKey(playingKey)}
                className="lw-preview-media"
                muted
                autoPlay
                playsInline
              />
            )}

            {playingKey && playingType === "audio" && (
              <div className="lw-audio-visual">
                <div className="lw-audio-bar" />
                <div className="lw-audio-bar" />
                <div className="lw-audio-bar" />
                <div className="lw-audio-bar" />
                <div className="lw-audio-bar" />
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
