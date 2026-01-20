"use client";

import { useEffect, useRef, useState } from "react";
import "./player.css";
import Tooltip from "@/components/Tooltip";
import { createPortal } from "react-dom";

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

async function getNpcPulse() {
  const res = await fetch("/api/npc-pulse/now-playing", {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.pulse || null;
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
   🔑 TIMING SYNC
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
  const [npcPulse, setNpcPulse] = useState(null);
  const [playerPulse, setPlayerPulse] = useState(null);

  const mediaRef = useRef(null);

  /* -------------------------------
     Poll: Now Playing (background)
  -------------------------------- */
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

  /* -------------------------------
     Poll: NPC Pulse (overlay)
  -------------------------------- */
  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    async function pollPulse() {
      try {
        const data = await getNpcPulse();
        if (cancelled) return;

        setNpcPulse(data);

        const delay = data ? 500 : 5000;
        timeoutId = setTimeout(pollPulse, delay);
      } catch {
        if (!cancelled) {
          timeoutId = setTimeout(pollPulse, 5000);
        }
      }
    }

    pollPulse();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  /* -------------------------------
     Poll: Player Pulse (sanity)
  -------------------------------- */
  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    async function pollPlayerPulse() {
      try {
        const data = await getPlayerPulse();
        if (cancelled) return;

        if (data) {
          console.log("[PLAYER PULSE RECEIVED]", data);
          setPlayerPulse(data);
        } else {
          setPlayerPulse(null);
        }

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

  const pulseKey = npcPulse?.key || null;
  const pulseUrl = pulseKey ? streamUrlForKey(pulseKey) : null;

  return (
    <div className="lw-player">
      {!key && <div className="lw-player-idle">NO SIGNAL</div>}

{/* Player Help Tooltip */}
<Tooltip
  content={{
    title: "Player View",
    body: "This screen displays live media, NPC pulses, and sanity effects pushed by the GM.",
  }}
>
  <button
    className="lw-player-help"
    aria-label="Player view help"
  >
    ⓘ
  </button>
</Tooltip>

      {/* -------------------------------
          Background Media
      -------------------------------- */}
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

      {/* -------------------------------
          NPC Pulse Overlay
      -------------------------------- */}
      {pulseUrl && (
        <div className="npc-pulse-overlay">
          <img
            src={pulseUrl}
            className="npc-pulse-image fade-pulse"
            alt=""
          />
        </div>
      )}

     {/* -------------------------------
    Player Pulse (Sanity) — PORTAL
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
        {playerPulse.players.map((p) => (
          <li key={p.player_id}>
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