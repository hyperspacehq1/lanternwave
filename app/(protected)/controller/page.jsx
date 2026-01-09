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
    const msg =
      urlData?.error ||
      `Upload initialization failed (status ${urlRes.status})`;
    throw new Error(msg);
  }

  const { uploadUrl, key } = urlData;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload to storage failed (status ${xhr.status})`));
    };

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

  const finData = await finRes.json().catch(() => null);
  if (!finRes.ok || finData?.ok === false) {
    const msg = finData?.error || `Finalize failed (status ${finRes.status})`;
    throw new Error(msg);
  }

  return key;
}

async function getNowPlaying() {
  const res = await fetch("/api/r2/now-playing", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return null;
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
  if (!res.ok) throw new Error("Not authenticated");
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

  // ✅ Source of truth for "what is playing" (server OR local audio)
  const playingKey = nowPlaying?.key || audio?.currentKey || null;

  // ✅ Preview source of truth
  const previewKey = playingKey;
  const previewType = previewKey ? clipTypeFromKey(previewKey) : null;
  const previewUrl = previewKey ? streamUrlForKey(previewKey) : null;

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
              disabled={loading}
              accept=".mp3,.mp4,.jpg,.jpeg,.png"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || loading) return;

                setUploadProgress(0);
                setUploadError(null);
                setLoading(true);

                try {
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

        {/* Library */}
        <section className="lw-panel">
          <h2 className="lw-panel-title">CLIP LIBRARY</h2>

          {loading && <div className="lw-loading">Loading clips…</div>}

          <div className="lw-clip-list">
            {clips.map((clip) => {
              const key = clip.object_key;
              const isNow = playingKey === key;
              const isBusy = busyKey === key || loading;

              return (
                <div
                  key={key}
                  className={`lw-clip-row ${isNow ? "lw-clip-row-active" : ""}`}
                >
                  <div className="lw-clip-main">
                    <span className="lw-clip-type">
                      {clipTypeFromKey(key).toUpperCase()}
                    </span>
                    <span className="lw-clip-name">{displayNameFromKey(key)}</span>
                  </div>

                  <div className="lw-clip-actions">
                    <button
                      // ✅ Animate/glow ONLY when loop is ON and THIS clip is playing
                      className={`lw-btn loop-btn ${audio?.loop && isNow ? "active" : ""}`}
                      disabled={isBusy}
                      title={audio?.loop ? "Loop enabled" : "Loop disabled"}
                      aria-pressed={!!audio?.loop}
                      onClick={() => {
                        if (!audio?.setLoop) return;
                        audio.setLoop(!audio.loop);
                      }}
                    >
                      ⟳
                    </button>

                    <button
                      className="lw-btn"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyKey(key);
                        try {
                          await setNowPlaying(key);
                          setNowPlayingState({ key });

                          // ✅ apply current loop mode BEFORE starting playback
                          if (audio?.setLoop) audio.setLoop(!!audio.loop);

                          audio.play(streamUrlForKey(key), key);
                        } finally {
                          setBusyKey(null);
                        }
                      }}
                    >
                      PLAY
                    </button>

                    <button
                      className="lw-btn"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyKey(key);
                        try {
                          await setNowPlaying(null);
                          setNowPlayingState(null);
                          audio.stop();
                        } finally {
                          setBusyKey(null);
                        }
                      }}
                    >
                      STOP
                    </button>

                    <button
                      className="lw-btn lw-btn-danger"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyKey(key);
                        try {
                          await deleteClip(key);
                          await refresh();
                        } finally {
                          setBusyKey(null);
                        }
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

        {/* Audience Preview */}
        <section className="lw-panel">
          <h2 className="lw-panel-title">AUDIENCE PREVIEW</h2>

          <div className="lw-preview-frame">
            {!previewKey && <div className="lw-preview-placeholder">NO CLIP</div>}

            {previewKey && previewType === "image" && (
              <img src={previewUrl} className="lw-preview-media" alt="preview" />
            )}

            {previewKey && previewType === "video" && (
              <video
                className="lw-preview-media"
                src={previewUrl}
                muted
                autoPlay
                loop={!!audio?.loop}
                playsInline
              />
            )}

            {previewKey && previewType === "audio" && (
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
