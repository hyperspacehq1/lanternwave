import { useEffect, useState, useRef } from "react";
import { getNowPlaying } from "../lib/api";
import { clipTypeFromKey } from "../lib/ui";
import { streamUrlForKey } from "../lib/api";

// Helper: extract key
function deriveKey(nowPlaying) {
  if (!nowPlaying) return null;
  if (!nowPlaying.key) return null;
  return nowPlaying.key;
}

export default function PlayerPage() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);

  const mediaRef = useRef(null);

  // ---------------------------------------------
  // Polling: Get Now Playing
  // ---------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await getNowPlaying();
        if (!cancelled) {
          setNowPlaying(result);
          setLoading(false);
        }
      } catch (err) {
        console.error("[LW Player] polling error", err);
      }

      if (!cancelled) {
        setTimeout(poll, 1500);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------
  // Compute key + type + URL
  // ---------------------------------------------
  const normalizedKey = deriveKey(nowPlaying);

  const clipType = normalizedKey
    ? clipTypeFromKey(normalizedKey.replace(/^clips\//, ""))
    : null;

  const immediateUrl = normalizedKey
    ? streamUrlForKey(normalizedKey)
    : null;

  const volume = nowPlaying?.volume ?? 100; // Default full volume
  const showNoSignal = !normalizedKey || !immediateUrl || !clipType;

  // ---------------------------------------------
  // Apply VOLUME whenever nowPlaying.volume changes
  // ---------------------------------------------
  useEffect(() => {
    if (!mediaRef.current) return;

    const safeVolume = Math.max(0, Math.min(100, volume)) / 100;
    mediaRef.current.volume = safeVolume;
  }, [volume, normalizedKey, immediateUrl]);

  // ---------------------------------------------
  // Render
  // ---------------------------------------------
  return (
    <div className="lw-player">
      {loading && (
        <div className="lw-player-idle">
          <div className="lw-player-idle-text">CONNECTING...</div>
        </div>
      )}

      {!loading && showNoSignal && (
        <div className="lw-player-idle">
          <div className="lw-player-idle-text">NO SIGNAL</div>
        </div>
      )}

      {!loading && !showNoSignal && (
        <ActiveMedia
          type={clipType}
          url={immediateUrl}
          mediaRef={mediaRef}
        />
      )}
    </div>
  );
}

// ---------------------------------------------
// Media Renderer (Unified className = lw-player-media)
// ---------------------------------------------
function ActiveMedia({ type, url, mediaRef }) {
  if (type === "audio") {
    return (
      <audio
        ref={mediaRef}
        src={url}
        autoPlay
        controls={false}
        className="lw-player-media"
      />
    );
  }

  if (type === "video") {
    return (
      <video
        ref={mediaRef}
        src={url}
        autoPlay
        controls={false}
        className="lw-player-media"
      />
    );
  }

  return (
    <img
      src={url}
      className="lw-player-media"
      alt="Now Playing"
    />
  );
}
