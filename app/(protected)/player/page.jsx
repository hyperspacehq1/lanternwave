"use client";

import "./player.css";
import { useEffect, useState, useRef } from "react";

/* ================================
   Helpers
================================ */
function clipTypeFromKey(key = "") {
  const lower = key.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio";
  if (lower.endsWith(".mp4")) return "video";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png"))
    return "image";
  return "unknown";
}

function streamUrlForKey(key) {
  return `/api/r2/stream?key=${encodeURIComponent(key)}`;
}

async function getNowPlaying() {
  const res = await fetch(`/api/r2/now-playing`, { cache: "no-store" });
  const data = await res.json();
  return data.nowPlaying;
}

function deriveKey(nowPlaying) {
  if (!nowPlaying || !nowPlaying.key) return null;
  return nowPlaying.key.startsWith("clips/")
    ? nowPlaying.key
    : `clips/${nowPlaying.key}`;
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
   Player Page
================================ */
export default function PlayerPage() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const mediaRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getNowPlaying();
        if (!cancelled) {
          setNowPlaying(data);
          setLoading(false);
        }
      } catch {}
      if (!cancelled) setTimeout(poll, 1200);
    }

    poll();
    return () => (cancelled = true);
  }, []);

  const key = deriveKey(nowPlaying);
  const type = key ? clipTypeFromKey(key) : null;
  const url = key ? streamUrlForKey(key) : null;

  const renderMedia = () => {
    if (!url || !type) return null;

    if (type === "audio") {
      return <audio ref={mediaRef} src={url} autoPlay />;
    }

    if (type === "video") {
      return (
        <video
          ref={mediaRef}
          src={url}
          autoPlay
          playsInline
          className="lw-preview-media"
          onLoadedMetadata={() =>
            syncMediaToNowPlaying(mediaRef.current, nowPlaying?.updatedAt)
          }
        />
      );
    }

    return <img src={url} className="lw-preview-media" />;
  };

  return (
    <div className="lw-player">
      {loading && <div className="lw-player-idle">CONNECTING...</div>}
      {!loading && !key && <div className="lw-player-idle">NO SIGNAL</div>}
      {!loading && key && (
        <div className="lw-preview-frame">{renderMedia()}</div>
      )}
    </div>
  );
}
