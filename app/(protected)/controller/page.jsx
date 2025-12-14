"use client";

import React, { useEffect, useState, useRef } from "react";
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
// API WRAPPERS (Next.js App Router)
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
  // 1) Request upload URL
  const urlRes = await fetch(`/api/r2/upload-url`, {
    method: "POST",
    body: JSON.stringify({ filename: file.name }),
    headers: { "Content-Type": "application/json" },
  });
  const { uploadUrl, key } = await urlRes.json();

  // 2) Upload directly to R2
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        const pct = (evt.loaded / evt.total) * 100;
        onProgress(pct);
      }
    };
    xhr.onload = resolve;
    xhr.onerror = reject;
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

  // 3) Finalize
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
// Loop Icon
// ===============================================
const LoopIcon = ({ active = false }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "#7CFF6B" : "#4A6B44"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      filter: active ? "drop-shadow(0 0 6px #7CFF6B)" : "none",
      transition: "0.2s ease-in-out",
    }}
  >
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <polyline points="21 3 21 9 15 9" />
  </svg>
);

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
  const [loopEnabled, setLoopEnabled] = useState(false);

  // ============================================================
  // LIST CLIPS
  // ============================================================
  async function refreshClips() {
    setLoadingList(true);
    try {
      const items = await listClips();
      items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      setClips(items);
    } catch (err) {
      console.error("listClips error:", err);
    } finally {
      setLoadingList(false);
    }
  }

  // ============================================================
  // NOW PLAYING
  // ============================================================
  async function refreshNowPlaying() {
    try {
      const np = await getNowPlaying();
      if (np && np.key) {
        const key = np.key.startsWith("clips/") ? np.key : `clips/${np.key}`;
        setNowPlayingState({ ...np, key });
        setPreviewKey(key);
      } else {
        setNowPlayingState(null);
        setPreviewKey(null);
      }
    } catch (err) {
      console.error("nowPlaying error:", err);
    }
  }

  // Load initial data
  useEffect(() => {
    refreshClips();
    refreshNowPlaying();
  }, []);

  // ============================================================
  // UPLOAD
  // ============================================================
  const handleFileChange = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    setUploadMessage("");

    try {
      const res = await uploadClip(file, (pct) => setUploadProgress(pct));
      setUploadMessage("Upload complete.");
      await refreshClips();
      setPreviewKey(res.key);
    } catch (err) {
      console.error("uploadClip error:", err);
      setUploadMessage("Upload error.");
    } finally {
      evt.target.value = "";
      setTimeout(() => setUploadProgress(null), 1500);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================
  const handleDelete = async (key) => {
    try {
      await deleteClip(key);
      setDeleteMessage("Clip deleted.");
      await refreshClips();
      if (previewKey === key) setPreviewKey(null);
    } catch (err) {
      console.error("delete error:", err);
      setDeleteMessage("Delete error.");
    }
  };

  // ============================================================
  // PLAY
  // ============================================================
  const handlePlay = async (key) => {
    try {
      const np = await setNowPlaying(key);
      setNowPlayingState(np);
      setPreviewKey(key);
    } catch (err) {
      console.error("setNowPlaying error:", err);
    }
  };

  // ============================================================
  // STOP
  // ============================================================
  const handleStop = async () => {
    try {
      if (previewMediaRef.current) {
        previewMediaRef.current.pause();
        previewMediaRef.current.removeAttribute("src");
        previewMediaRef.current.load();
      }
      const np = await setNowPlaying(null);
      setNowPlayingState(np);
      setPreviewKey(null);
    } catch (err) {
      console.error("stop error:", err);
    }
  };

  // ============================================================
  // PREVIEW LOGIC
  // ============================================================
  const previewUrl = previewKey ? streamUrlForKey(previewKey) : null;
  const previewType = previewKey ? clipTypeFromKey(previewKey) : null;

  // ============================================================
  // UI (with header + layout wrappers)
  // ============================================================
  return (
    <div className="lw-root">
      import Header from "@/components/Header";

/* ... */

{/* HEADER BAR */}
<Header />

      {/* MAIN AREA */}
      <main className="lw-main">
        <div className="lw-console">
          {/* ============================================================
              UPLOAD PANEL
          ============================================================ */}
          <section className="lw-panel">
            <h2 className="lw-panel-title">UPLOAD CLIP</h2>

            <label className="lw-file-button">
              <span>SELECT FILE</span>
              <input
                type="file"
                accept=".mp3,.mp4,.jpg,.jpeg,.png"
                onChange={handleFileChange}
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

          {/* ============================================================
              LIBRARY PANEL
          ============================================================ */}
          <section className="lw-panel">
            <h2 className="lw-panel-title">CLIP LIBRARY</h2>

            {loadingList && (
              <div className="lw-status-line">Loading...</div>
            )}

            <div className="lw-clip-list">
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

                      {isNow && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.7rem",
                            color: "var(--lw-green)",
                          }}
                        >
                          NOW PLAYING
                        </span>
                      )}
                    </div>

                    <div className="lw-clip-actions">
                      {(type === "audio" || type === "video") && (
                        <>
                          <button
                            className="lw-btn"
                            onClick={() => handlePlay(clip.key)}
                          >
                            PLAY
                          </button>
                          <button className="lw-btn" onClick={handleStop}>
                            STOP
                          </button>
                        </>
                      )}

                      {type === "image" && (
                        <>
                          <button
                            className="lw-btn"
                            onClick={() => handlePlay(clip.key)}
                          >
                            SHOW
                          </button>
                          <button className="lw-btn" onClick={handleStop}>
                            HIDE
                          </button>
                        </>
                      )}

                      <button
                        className="lw-btn lw-btn-danger"
                        onClick={() => handleDelete(clip.key)}
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ============================================================
              PREVIEW PANEL
          ============================================================ */}
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
                <div className="lw-audio-visualizer">
                  <div className="lw-audio-bar" />
                  <div className="lw-audio-bar" />
                  <div className="lw-audio-bar" />
                  <div className="lw-audio-bar" />

                  <audio
                    ref={previewMediaRef}
                    src={previewUrl}
                    autoPlay
                    loop={loopEnabled}
                    style={{ display: "none" }}
                  />
                </div>
              )}

              {previewUrl && previewType === "video" && (
                <video
                  ref={previewMediaRef}
                  className="lw-preview-media"
                  src={previewUrl}
                  autoPlay
                  controls
                  loop={loopEnabled}
                />
              )}
            </div>

            {/* LOOP BUTTON */}
            <div className="lw-loop-toggle" style={{ marginTop: "12px" }}>
              <button
                className="lw-btn"
                onClick={() => setLoopEnabled(!loopEnabled)}
                style={{
                  padding: "6px 10px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <LoopIcon active={loopEnabled} />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
