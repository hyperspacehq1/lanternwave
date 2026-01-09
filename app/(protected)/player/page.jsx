"use client";

import { useEffect, useRef, useState } from "react";
import "./player.css";

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

function streamUrlForKey(key) {
  return `/api/r2/stream?key=${encodeURIComponent(key)}`;
}

async function getNowPlaying() {
  const res = await fetch("/api/r2/now-playing", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.nowPlaying || null;
}

/* ================================
   🔑 TIMING SYNC (NEW)
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
  const mediaRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getNowPlaying();
        if (!cancelled) setNowPlaying(data);
      } catch {}
      if (!cancelled) setTimeout(poll, 1200);
    }

    poll();
    return () => (cancelled = true);
  }, []);

  const key = nowPlaying?.key || null;
  const type = key ? clipTypeFromKey(key) : null;
  const url = key ? streamUrlForKey(key) : null;

  return (
    <div className="lw-player">
      {!key && <div className="lw-player-idle">NO SIGNAL</div>}

      {key && type === "image" && (
        <div className="lw-preview-frame">
          <img src={url} className="lw-preview-media" />
        </div>
      )}

      {key && type === "audio" && (
        <audio ref={mediaRef} src={url} autoPlay />
      )}

      {key && type === "video" && (
        <div className="lw-preview-frame">
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
        </div>
      )}
    </div>
  );
}
