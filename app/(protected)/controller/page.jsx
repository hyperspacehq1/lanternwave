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

  const urlData = await urlRes.json();
  if (!urlRes.ok || !urlData?.uploadUrl)
    throw new Error("Upload initialization failed");

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

  const fin = await fetch("/api/r2/finalize", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ key }),
    headers: { "Content-Type": "application/json" },
  });

  if (!fin.ok) throw new Error("Finalize failed");
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
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loop, setLoop] = useState(false);

  /* Sync loop state to audio engine */
  useEffect(() => {
    if (audio?.setLoop) audio.setLoop(loop);
  }, [loop, audio]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const rows = await listClips();
      setClips(rows);
      setNowPlaying(await getNowPlaying());
      setLoading(false);
    })();
  }, []);

  const previewKey = nowPlaying?.key || audio?.currentKey || null;
  const previewType = previewKey ? clipTypeFromKey(previewKey) : null;
  const previewUrl = previewKey ? streamUrlForKey(previewKey) : null;

  return (
    <div className="lw-console">
      {/* UPLOAD */}
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
              if (!file) return;
              setUploadProgress(0);
              setUploadError(null);
              try {
                await uploadClip(file, setUploadProgress);
                setUploadProgress(null);
                await refresh();
              } catch (err) {
                setUploadError(err.message);
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

      {/* CLIPS */}
      <section className="lw-panel">
        <h2 className="lw-panel-title">CLIP LIBRARY</h2>

        <div className="lw-clip-list">
          {clips.map((clip) => {
            const key = clip.object_key;
            const isBusy = busyKey === key;

            return (
              <div key={key} className="lw-clip-row">
                <div className="lw-clip-main">
                  <span className="lw-clip-type">
                    {clipTypeFromKey(key).toUpperCase()}
                  </span>
                  <span className="lw-clip-name">{displayNameFromKey(key)}</span>
                </div>

                <div className="lw-clip-actions">
                  <button
                    className={`loop-btn ${loop ? "active" : ""}`}
                    onClick={() => setLoop(!loop)}
                    title="Loop"
                  >
                    ⟳
                  </button>

                  <button
                    className="lw-btn"
                    onClick={async () => {
                      setBusyKey(key);
                      await setNowPlaying(key);
                      audio.play(streamUrlForKey(key), key);
                      setBusyKey(null);
                    }}
                  >
                    PLAY
                  </button>

                  <button
                    className="lw-btn"
                    onClick={() => {
                      audio.stop();
                      setNowPlaying(null);
                    }}
                  >
                    STOP
                  </button>

                  <button
                    className="lw-btn lw-btn-danger"
                    onClick={async () => {
                      setBusyKey(key);
                      await deleteClip(key);
                      setBusyKey(null);
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

      {/* PREVIEW */}
      <section className="lw-panel">
        <h2 className="lw-panel-title">AUDIENCE PREVIEW</h2>

        <div className="lw-preview-frame">
          {!previewKey && (
            <div className="lw-preview-placeholder">NO CLIP</div>
          )}

          {previewKey && previewType === "image" && (
            <img src={previewUrl} className="lw-preview-media" />
          )}

          {previewKey && previewType === "video" && (
            <video
              className="lw-preview-media"
              src={previewUrl}
              muted
              autoPlay
              loop={loop}
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
  );
}

