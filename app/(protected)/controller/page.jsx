"use client";

import React, { useEffect, useState } from "react";
import { useGlobalAudio } from "@/components/GlobalAudio";
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
// API helpers (CLIENT)
// ===============================================
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
  const res = await fetch(
    `/api/r2/delete?key=${encodeURIComponent(key)}`,
    { method: "DELETE", credentials: "include" }
  );
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

async function uploadClip(file, onProgress) {
  const urlRes = await fetch("/api/r2/upload-url", {
    method: "POST",
    credentials: "include",
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

  await fetch("/api/r2/finalize", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ key }),
    headers: { "Content-Type": "application/json" },
  });

  return { key };
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

// ===============================================
// Controller Page
// ===============================================
export default function ControllerPage() {
  const audio = useGlobalAudio();

  const [clips, setClips] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [nowPlaying, setNowPlayingState] = useState(null);
  const [loop, setLoop] = useState(false);

  async function refreshClipsAndAuth() {
    setLoadingList(true);
    try {
      const rows = await listClips();
      rows.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setClips(rows);

      const np = await getNowPlaying();
      setNowPlayingState(np || null);
    } catch {
      setClips([]);
      setNowPlayingState(null);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    refreshClipsAndAuth();
  }, []);

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
                await uploadClip(file, (pct) =>
                  setUploadProgress(pct)
                );
                setUploadMessage("Upload complete.");
                await refreshClipsAndAuth();
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

        {(uploadMessage || deleteMessage) && (
          <div className="lw-status-line">
            {uploadMessage || deleteMessage}
          </div>
        )}
      </section>

      {/* Clip Library */}
      <section className="lw-panel">
        <h2 className="lw-panel-title">CLIP LIBRARY</h2>

        {loadingList && (
          <div className="lw-status-line">Loading…</div>
        )}

        <div className="lw-clip-list">
          {clips.map((clip) => {
            const key = clip.object_key;
            const isNow = nowPlaying?.key === key;

            return (
              <div
                key={key}
                className={`lw-clip-row ${
                  isNow ? "lw-clip-row-active" : ""
                }`}
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
                    className={`loop-btn ${loop ? "active" : ""}`}
                    onClick={() => {
                      setLoop((v) => !v);
                      audio.setLoop(!loop);
                    }}
                    title="Loop playback"
                  >
                    ⟳
                  </button>

                  <button
                    className="lw-btn"
                    onClick={async () => {
                      await setNowPlaying(key);
                      setNowPlayingState({ key });
                      audio.play(streamUrlForKey(key), key);
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
                      setDeleteMessage("Clip deleted.");
                      await refreshClipsAndAuth();
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
          {!nowPlaying && (
            <div className="lw-preview-placeholder">NO CLIP</div>
          )}

          {nowPlaying &&
            clipTypeFromKey(nowPlaying.key) === "image" && (
              <img
                src={streamUrlForKey(nowPlaying.key)}
                className="lw-preview-media"
                alt="preview"
              />
            )}
        </div>
      </section>
    </div>
  );
}
