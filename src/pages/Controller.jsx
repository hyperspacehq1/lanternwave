// src/pages/Controller.jsx
import React, { useEffect, useState, useRef } from "react";
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

export default function ControllerPage() {
  const [clips, setClips] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [volume, setVolume] = useState(80);
  const [nowPlaying, setNowPlayingState] = useState(null);

  // Always a *full R2 key* like: "clips/myvideo.mp4"
  const [previewKey, setPreviewKey] = useState(null);

  // 🔧 NEW: Media ref to control preview playback
  const previewMediaRef = useRef(null);

  /** -------------------------------------------
   * LIST CLIPS
   * ------------------------------------------- */
  async function refreshClips() {
    setLoadingList(true);
    try {
      const items = await listClips();
      items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      setClips(items);
      console.log("[LW Controller] listClips ->", items);
    } catch (err) {
      console.error("[LW Controller] listClips error", err);
    } finally {
      setLoadingList(false);
    }
  }

  /** -------------------------------------------
   * NOW PLAYING NORMALIZATION
   * Server returns shape: { key, type, updatedAt } or null
   * We convert to always "clips/<key>"
   * ------------------------------------------- */
  async function refreshNowPlaying() {
    try {
      const np = await getNowPlaying(); // { key, type, updatedAt } or null
      console.log("[LW Controller] getNowPlaying ->", np);

      if (np && np.key) {
        const bare = np.key.replace(/^clips\//, "");
        const fullKey = `clips/${bare}`;

        const normalized = { ...np, key: fullKey };
        setNowPlayingState(normalized);
        setPreviewKey(fullKey);
      } else {
        setNowPlayingState(null);
        setPreviewKey(null);
      }
    } catch (err) {
      console.error("[LW Controller] getNowPlaying error", err);
    }
  }

  useEffect(() => {
    refreshClips();
    refreshNowPlaying();
  }, []);

  /** -------------------------------------------
   * UPLOAD
   * ------------------------------------------- */
  const handleFileChange = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    setUploadMessage("");

    try {
      const res = await uploadClip(file, (pct) => setUploadProgress(pct));
      console.log("[LW Controller] uploadClip ->", res);

      // res.key is ALWAYS full R2 key (clips/filename)
      setUploadMessage("Your file has been uploaded.");
      await refreshClips();
      setPreviewKey(res.key);
    } catch (err) {
      console.error("[LW Controller] uploadClip error", err);
      setUploadMessage("There was an error uploading your file");
    } finally {
      evt.target.value = "";
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  /** -------------------------------------------
   * DELETE
   * ------------------------------------------- */
  const handleDelete = async (key) => {
    setDeleteMessage("");
    try {
      console.log("[LW Controller] deleteClip", key);
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

  /** -------------------------------------------
   * PLAY (SHOW/PLAY)
   * ------------------------------------------- */
  const handlePlay = async (key) => {
    try {
      console.log("[LW Controller] setNowPlaying ->", key);
      const np = await setNowPlaying(key);

      // np.key from server may be bare "filename.mp4"
      const normalized = np?.key
        ? {
            ...np,
            key, // force full correct key ("clips/<file>")
          }
        : np;

      setNowPlayingState(normalized);
      setPreviewKey(key);
    } catch (err) {
      console.error("[LW Controller] setNowPlaying error", err);
    }
  };

  /** -------------------------------------------
   * STOP (HIDE)
   * ------------------------------------------- */
  const handleStop = async () => {
    try {
      console.log("[LW Controller] setNowPlaying -> null (STOP/HIDE)");

      // 🔧 NEW: Stop preview audio/video
      if (previewMediaRef.current) {
        try {
          previewMediaRef.current.pause();
          previewMediaRef.current.removeAttribute("src");
          previewMediaRef.current.load();
        } catch (err) {
          console.warn("[LW Controller] previewMediaRef stop error", err);
        }
      }

      const np = await setNowPlaying(null);
      setNowPlayingState(np);
      setPreviewKey(null);
    } catch (err) {
      console.error("[LW Controller] setNowPlaying(null) error", err);
    }
  };

  /** -------------------------------------------
   * PREVIEW
   * ------------------------------------------- */
  const previewUrl = previewKey ? streamUrlForKey(previewKey) : null;
  const previewType = previewKey ? clipTypeFromKey(previewKey) : null;

  return (
    <div className="lw-console">
      {/* -------------------------------------- */}
      {/* UPLOAD PANEL */}
      {/* -------------------------------------- */}
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

        {uploadProgress > 0 && (
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

      {/* -------------------------------------- */}
      {/* LIBRARY PANEL */}
      {/* -------------------------------------- */}
      <section className="lw-panel lw-panel-library">
        <h2 className="lw-panel-title">CLIP LIBRARY</h2>
        {loadingList && <div className="lw-status-line">LOADING...</div>}

        <div className="lw-clip-list">
          {clips.map((clip) => {
            const type = clipTypeFromKey(clip.key);

            // Correct highlight: both sides now use full "clips/<file>"
            const isNow = nowPlaying?.key === clip.key;

            return (
              <div
                key={clip.key}
                className={
                  "lw-clip-row" + (isNow ? " lw-clip-row-active" : "")
                }
              >
                <div className="lw-clip-main">
                  <span className="lw-clip-type">{type.toUpperCase()}</span>
                  <span className="lw-clip-name">
                    {displayNameFromKey(clip.key)}
                  </span>
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

      {/* -------------------------------------- */}
      {/* PREVIEW PANEL */}
      {/* -------------------------------------- */}
      <section className="lw-panel lw-panel-preview">
        <h2 className="lw-panel-title">AUDIENCE PREVIEW</h2>

        <div className="lw-preview-frame">
          {!previewUrl && <div className="lw-preview-placeholder">NO CLIP</div>}

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
              className="lw-preview-media"
            />
          )}
        </div>

        <div className="lw-volume-block">
          <div className="lw-volume-label">VOLUME</div>
          <input
            type="range"
            min={VOLUME_MIN}
            max={VOLUME_MAX}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="lw-volume-slider"
          />
          <div className="lw-volume-value">{volume}</div>
        </div>
      </section>
    </div>
  );
}
