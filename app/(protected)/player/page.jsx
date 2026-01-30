"use client";

import { useEffect, useRef, useState } from "react";
import "./player.css";
import { createPortal } from "react-dom";
import { TOOLTIPS } from "@/lib/tooltips/tooltips";

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
  const res = await fetch("/api/r2/now-playing", {
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.nowPlaying ?? null;
}

async function getPlayerPulse() {
  const res = await fetch("/api/player-sanity-pulse", {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.pulse || null;
}

/* ================================
   Video timing sync only
================================ */
function syncVideoToNowPlaying(videoEl, updatedAt) {
  if (!videoEl || !updatedAt || videoEl.__synced) return;

  const startedAt = new Date(updatedAt).getTime();
  const elapsed = (Date.now() - startedAt) / 1000;

  if (elapsed > 0 && !Number.isNaN(elapsed)) {
    videoEl.currentTime = elapsed;
    videoEl.__synced = true;
  }
}

/* ================================
   Player Page (mirrored)
================================ */
export default function PlayerPage() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [playerPulse, setPlayerPulse] = useState(null);
  const [prevImageKey, setPrevImageKey] = useState(null);

  const mediaRef = useRef(null);
  const pollDelayRef = useRef(1200);

  /* -------------------------------
     Poll: Now Playing
  -------------------------------- */
  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    async function poll() {
      try {
        const data = await getNowPlaying();
        if (cancelled) return;

        setNowPlaying((prev) => {
          if (prev?.key !== data?.key && prev?.key && data?.key) {
            setPrevImageKey(prev.key);
            setTimeout(() => setPrevImageKey(null), 600);
          }
          return data;
        });

        pollDelayRef.current = data ? 1200 : 3000;
      } catch {
        pollDelayRef.current = 5000;
      }

      timeoutId = setTimeout(poll, pollDelayRef.current);
    }

    poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  /* -------------------------------
     Poll: Player Pulse
  -------------------------------- */
  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    async function pollPlayerPulse() {
      try {
        const data = await getPlayerPulse();
        if (cancelled) return;
        setPlayerPulse(data || null);
        timeoutId = setTimeout(pollPlayerPulse, 1000);
      } catch {
        if (!cancelled) timeoutId = setTimeout(pollPlayerPulse, 3000);
      }
    }

    pollPlayerPulse();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const key = nowPlaying?.key || null;
  const type = key ? clipTypeFromKey(key) : null;
  const url = key ? streamUrlForKey(key) : null;
  const prevUrl = prevImageKey ? streamUrlForKey(prevImageKey) : null;

  return (
    <div className="lw-player">
      {!key && <div className="lw-player-idle">NO SIGNAL</div>}

      <button className="lw-player-help" aria-label="Player view help">
        ⓘ
        <span className="lw-player-help-tooltip">
          {TOOLTIPS.player.help.body}
        </span>
      </button>

      {/* -------------------------------
          Images
      -------------------------------- */}
      {type === "image" && (
        <div className="lw-preview-frame">
          {prevUrl && (
            <img
              src={prevUrl}
              className="lw-preview-media lw-preview-media--fade-out"
              alt=""
            />
          )}
          {url && (
            <img
              src={url}
              className="lw-preview-media lw-preview-media--fade-in"
              alt=""
            />
          )}
        </div>
      )}

      {/* -------------------------------
          Video (muted, synced)
      -------------------------------- */}
      {key && type === "video" && (
        <div className="lw-preview-frame">
          <video
            ref={mediaRef}
            src={url}
            autoPlay
            muted
            playsInline
            className="lw-preview-media"
            onLoadedMetadata={() =>
              syncVideoToNowPlaying(mediaRef.current, nowPlaying?.updatedAt)
            }
          />
        </div>
      )}

      {/* -------------------------------
          Audio (mirrored – visual only)
      -------------------------------- */}
      {key && type === "audio" && (
  <div className="lw-player-audio">
    <div className="lw-player-waves">
      <span className="lw-wave" />
      <span className="lw-wave" />
      <span className="lw-wave" />
      <span className="lw-wave" />
      <span className="lw-wave" />
    </div>
  </div>
)}
      {/* -------------------------------
          Player Pulse – PORTAL
      -------------------------------- */}
      {playerPulse &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            key={playerPulse?.title + JSON.stringify(playerPulse.players)}
            className="lw-player-sanity-pulse lw-player-sanity-pulse--animate"
            role="status"
            aria-live="polite"
          >
            <strong>{playerPulse.title}</strong>
            <ul>
              {playerPulse.players.map((p, idx) => (
                <li key={p.player_id || idx}>
                  {p.character_name && (
                    <span className="lw-player-character-name">
                      {p.character_name}:{" "}
                    </span>
                  )}
                  SAN {p.current}
                  {p.loss ? ` (-${p.loss})` : ""}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
