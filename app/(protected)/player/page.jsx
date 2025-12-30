"use client";

import "./player.css";
import { useEffect, useState, useRef } from "react";

// ===========================================================================
// Helpers copied from Controller (so Player shares 100% logic)
// ===========================================================================
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

// Extract key
function deriveKey(nowPlaying) {
  if (!nowPlaying || !nowPlaying.key) return null;
  return nowPlaying.key.startsWith("clips/")
    ? nowPlaying.key
    : `clips/${nowPlaying.key}`;
}

// ===========================================================================
// Player Page
// ===========================================================================
export default function PlayerPage() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const mediaRef = useRef(null);

  // POLLING
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getNowPlaying();
        if (!cancelled) {
          setNowPlaying(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("[LW Player] Poll error:", err);
      }
      if (!cancelled) setTimeout(poll, 1200);
    }

    poll();
    return () => (cancelled = true);
  }, []);

  const key = deriveKey(nowPlaying);
  const type = key ? clipTypeFromKey(key) : null;
  const url = key ? streamUrlForKey(key) : null;

  const volume = nowPlaying?.volume ?? 100;

  // Apply volume when changed
  useEffect(() => {
    if (!mediaRef.current) return;
    mediaRef.current.volume = Math.max(0, Math.min(1, volume / 100));
  }, [volume, key, url]);

  // IMAGE / AUDIO / VIDEO RENDERER
  const renderMedia = () => {
    if (!url || !type) return null;

    if (type === "audio") {
      return (
        <audio
          ref={mediaRef}
          src={url}
          autoPlay
          className="lw-preview-media"
        />
      );
    }

    if (type === "video") {
      return (
        <video
          ref={mediaRef}
          src={url}
          autoPlay
          className="lw-preview-media"
        />
      );
    }

    return (
      <img
        src={url}
        alt="Now Playing"
        className="lw-preview-media"
      />
    );
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="lw-player">
      {/* NO SIGNAL / LOADING */}
      {loading && (
        <div className="lw-player-idle">
          <div className="lw-player-idle-text">CONNECTING...</div>
        </div>
      )}

      {!loading && !key && (
        <div className="lw-player-idle">
          <div className="lw-player-idle-text">NO SIGNAL</div>
        </div>
      )}

      {/* ACTIVE PLAYER CONTAINER (uses same frame as controller preview) */}
      {!loading && key && (
        <div className="lw-preview-frame">
          {renderMedia()}
        </div>
      )}
    </div>
  );
}
