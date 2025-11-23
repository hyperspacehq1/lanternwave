import { useEffect, useState, useRef } from "react";
import { getNowPlaying } from "../lib/api";
import { clipTypeFromKey } from "../lib/ui";
import { streamUrlForKey } from "../lib/api";

// Helper: extract key (your existing logic)
function deriveKey(nowPlaying) {
  if (!nowPlaying) return null;
  if (!nowPlaying.key) return null;
  return nowPlaying.key;
}

export default function PlayerPage() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);

  const mediaRef = useRef(null);

  // NEW delayed visual states
  const [delayedKey, setDelayedKey] = useState(null);
  const [delayedType, setDelayedType] = useState(null);
  const [delayedUrl, setDelayedUrl] = useState(null);

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
        setTimeout(poll, 1500); // every 1.5s
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------
  // Compute current (immediate) key + type + URL
  // (Audio uses this version)
  // ---------------------------------------------
  const normalizedKey = deriveKey(nowPlaying);

  const clipType = normalizedKey
    ? clipTypeFromKey(normalizedKey.replace(/^clips\//, ""))
    : null;

  const immediateUrl = normalizedKey ? streamUrlForKey(normalizedKey) : null;

  // ---------------------------------------------
  // 4-SECOND VISUAL DELAY
  // ---------------------------------------------
  useEffect(() => {
    if (!normalizedKey) {
      // "STOP" state — immediately clear visuals
      setDelayedKey(null);
      setDelayedType(null);
      setDelayedUrl(null);
      return;
    }

    // Delay UI update by 4 seconds to sync with audio
    const timer = setTimeout(() => {
      setDelayedKey(normalizedKey);
      setDelayedType(clipType);

      try {
        setDelayedUrl(streamUrlForKey(normalizedKey));
      } catch (err) {
        console.error("[LW Player] delayed visual URL error", err);
      }
    }, 7800);

    return () => clearTimeout(timer);
  }, [normalizedKey, clipType]);

  // ---------------------------------------------
  // Render Logic
  // ---------------------------------------------
  const showNoSignal = !delayedKey || !delayedUrl || !delayedType;

  return (
    <div className="lw-player-wrapper">
      {loading && (
        <div className="lw-player-loading">CONNECTING...</div>
      )}

      {!loading && showNoSignal && (
        <div className="lw-player-nosignal">
          <p>NO SIGNAL</p>
        </div>
      )}

      {!loading && !showNoSignal && (
        <ActiveMedia
          type={delayedType}
          url={delayedUrl}
          mediaRef={mediaRef}
        />
      )}
    </div>
  );
}

// ---------------------------------------------
// Renders the actual audio/video/image
// ---------------------------------------------
function ActiveMedia({ type, url, mediaRef }) {
  if (type === "audio") {
    return (
      <audio
        ref={mediaRef}
        src={url}
        autoPlay
        controls={false}
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
        className="lw-player-video"
      />
    );
  }

  return (
    <img
      src={url}
      className="lw-player-image"
      alt="Now Playing"
    />
  );
}
