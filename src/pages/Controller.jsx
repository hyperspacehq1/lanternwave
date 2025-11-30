// src/pages/Controller.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

import {
  uploadClip,
  listClips,
  deleteClip,
  streamUrlForKey,
  setNowPlaying,
  getNowPlaying,
} from "../lib/api.js";
import { clipTypeFromKey, displayNameFromKey } from "../lib/ui.js";

const VOLUME_MIN = 0;
const VOLUME_MAX = 100;

// ------------------------------
// LanternWave Minimal Loop Icon
// ------------------------------
const LoopIcon = ({ active = false }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "var(--lw-green)" : "var(--lw-text-dim)"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      filter: active ? "drop-shadow(0 0 6px var(--lw-green))" : "none",
      transition: "0.2s ease-in-out",
    }}
  >
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <polyline points="21 3 21 9 15 9" />
  </svg>
);

export default function ControllerPage() {
  const location = useLocation();
  const isActive = location.pathname === "/";

  const [clips, setClips] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

  const [volume, setVolume] = useState(80);
  const [nowPlaying, setNowPlayingState] = useState(null);

  const [previewKey, setPreviewKey] = useState(null);
  const previewMediaRef = useRef(null);

  // NEW: Loop toggle state
  const [loopEnabled, setLoopEnabled] = useState(false);

  // -------------------------------------------
  // LIST CLIPS
  // -------------------------------------------
  async function refreshClips() {
    if (!isActive) return;
    setLoadingList(true);
    try {
      const items = await listClips();
      items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      setClips(items);
    } catch (err) {
      console.error("[LW Controller] listClips error", err);
    } finally {
      setLoadingList(false);
    }
  }

  // -------------------------------------------
  // NOW PLAYING NORMALIZATION
  // -------------------------------------------
  async function refreshNowPlaying() {
    if (!isActive) return;
    try {
      const np = await getNowPlaying();

      if (np && np.key) {
        const bare = np.key.replace(/^clips\//, "");
        const fullKey = `clips/${bare}`;
        setNowPlayingState({ ...np, key: fullKey });
        setPreviewKey(fullKey);
      } else {
        setNowPlayingState(null);
        setPreviewKey(null);
      }
    } catch (err) {
      console.error("[LW Controller] getNowPlaying error", err);
    }
  }

  // -------------------------------------------
  // CONTROLLER LOGIC
  // -------------------------------------------
  useEffect(() => {
    if (!isActive) return;

    refreshClips();
    refreshNowPlaying();
  }, [isActive]);

  // -------------------------------------------
  // UPLOAD
  // -------------------------------------------
  const handleFileChange = async (evt) => {
    if (!isActive) return;

    const file = evt.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    setUploadMessage("");

    try {
      const res = await uploadClip(file, (pct) => setUploadProgress(pct));
      setUploadMessage("Your file has been uploaded.");
      await refreshClips();
      setPreviewKey(res.key);
    } catch (err) {
      console.error("[LW Controller] uploadClip error", err);
      setUploadMessage("There was an error uploading your file");
    } finally {
      evt.target.value = "";
      setTimeout(() => setUploadProgress(null), 1500);
    }
  };

  // -------------------------------------------
  // DELETE
  // -------------------------------------------
  const handleDelete = async (key) => {
    if (!isActive) return;

    setDeleteMessage("");
    try {
      await deleteClip(key);
      setDeleteMessage("Your file has been deleted.");
      await refreshClips();

      if (previewKey === key) {
        setPreviewKey(null);
      }
    } catch (err) {
      console.error("[LW Controller] deleteClip error", err);
      setDeleteMessage("There was an error deleting your file");
    }
  };

  // -------------------------------------------
  // PLAY
  // -------------------------------------------
  const handlePlay = async (key) => {
    if (!isActive) return;

    try {
      const np = await setNowPlaying(key);
      const normalized = np?.key ? { ...np, key } : np;

      setNowPlayingState(normalized);
      setPreviewKey(key);
    } catch (err) {
      console.error("[LW Controller] setNowPlaying error", err);
    }
  };

  // -------------------------------------------
  // STOP
  // -------------------------------------------
  const handleStop = async () => {
    if (!isActive) return;

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
      console.error("[LW Controller] setNowPlaying(null) error", err);
    }
  };

  // -------------------------------------------
  // PREVIEW
  // -------------------------------------------
  const previewUrl = previewKey ? streamUrlForKey(previewKey) : null;
  const previewType = previewKey ? clipTypeFromKey(previewKey) : null;

  return (
    <div className="lw-console">

      {/* UPLOAD PANEL */}
      <section className="lw-panel lw-panel-upload">
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

        {uploadMessage && <div className="lw-status-line">{uploadMessage}</div>}
        {deleteMessage && <div className="lw-status-line">{deleteMessage}</div>}
      </section>

      {/* LIBRARY PANEL */}
      <section className="lw-panel lw-panel-library">
        <h2 className="lw-panel-title">CLIP LIBRARY</h2>
        {loadingList && <div className="lw-status-line">LOADING...</div>}

        <div className="lw-clip-list">
          {clips.map((clip) => {
            const type = clipTypeFromKey(clip.key);
            const isNow = nowPlaying?.key === clip.key;

            return (
              <div
                key={clip.key}
                className={
                  "lw-clip-row" + (isNow ? " lw-clip-row-active" : "")
                }
                style={
                  isNow
                    ? {
                        boxShadow: "0 0 14px rgba(0, 255, 120, 0.7)",
                        borderColor: "var(--lw-green)",
                        background: "rgba(0, 255, 80, 0.10)",
                      }
                    : undefined
                }
              >
                <div className="lw-clip-main">
                  <span className="lw-clip-type">{type.toUpperCase()}</span>
                  <span className="lw-clip-name">
                    {displayNameFromKey(clip.key)}
                  </span>

                  {isNow && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.7rem",
                        color: "var(--lw-green)",
                        opacity: 0.9,
                        letterSpacing: "0.08em",
                      }}
                    >
                      NOW PLAYING
                    </span>
                  )}
                </div>

                <div className="lw-clip-actions">
                  {(type === "audio" || type === "video") && (
                    <>
                      <button className="lw-btn" onClick={() => handlePlay(clip.key)}>
                        PLAY
                      </button>
                      <button className="lw-btn" onClick={handleStop}>
                        STOP
                      </button>
                    </>
                  )}

                  {type === "image" && (
                    <>
                      <button className="lw-btn" onClick={() => handlePlay(clip.key)}>
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

      {/* PREVIEW PANEL */}
      <section className="lw-panel lw-panel-preview">
        <h2 className="lw-panel-title">AUDIENCE PREVIEW</h2>

        <div className="lw-preview-frame">
          {!previewUrl && (
            <div className="lw-preview-placeholder">NO CLIP</div>
          )}

          {previewUrl && previewType === "image" && (
            <img src={previewUrl} alt="Preview" className="lw-preview-media" />
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
                controls={false}
                loop={loopEnabled}   // ← LOOP ENABLED HERE
                style={{ display: "none" }}
              />
            </div>
          )}

          {previewUrl && previewType === "video" && (
            <video
              ref={previewMediaRef}
              src={previewUrl}
              autoPlay
              controls
              loop={loopEnabled}     // ← LOOP ENABLED HERE
              className="lw-preview-media"
            />
          )}
        </div>

        {/* Loop Toggle Button */}
        <div className="lw-loop-toggle" style={{ marginTop: "12px" }}>
          <button
            className="lw-btn"
            onClick={() => setLoopEnabled(!loopEnabled)}
            style={{
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LoopIcon active={loopEnabled} />
          </button>
        </div>
      </section>
    </div>
  );
}
