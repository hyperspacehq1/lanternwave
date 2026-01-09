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
   🔑 TIMING SYNC HELPER (NEW)
================================ */
function syncMediaToNowPlaying(mediaEl, updatedAt) {
  if (!mediaEl || !updatedAt || mediaEl.__synced) return;

  const startedAt = new Date(updatedAt).getTime();
  const elapsed = (Date.now() - startedAt) / 1000;

  if (elapsed > 0 && !Number.isNaN(elapsed)) {
    mediaEl.currentTime = elapsed;
    mediaEl.__synced = true;
  }
}

/* ================================
   API helpers
================================ */
// (unchanged)
async function listClips() { /* unchanged */ }
async function deleteClip(key) { /* unchanged */ }
async function uploadClip(file, onProgress) { /* unchanged */ }
async function getNowPlaying() { /* unchanged */ }
async function setNowPlaying(key) { /* unchanged */ }

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

  const playingKey = nowPlaying?.key || null;
  const playingType = playingKey ? clipTypeFromKey(playingKey) : null;

  return (
    <div className="lw-main">
      <div className="lw-console">

        {/* Upload + Library sections unchanged */}

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
                onLoadedMetadata={(e) =>
                  syncMediaToNowPlaying(e.currentTarget, nowPlaying?.updatedAt)
                }
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
