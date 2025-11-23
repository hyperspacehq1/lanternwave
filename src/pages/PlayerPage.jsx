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
  // Compute immediate key + type + URL (no delay)
  // ---------------------------------------------
  const normalizedKey = deriveKey(nowPlaying);

  const clipType = normalizedKey
    ? clipTypeFromKey(normalizedKey.replace(/^clips\//, ""))
    : null;

  const immediateUrl = normalizedKey
    ? streamUrlForKey(normalizedKey)
    : null;

  const showNoSignal = !normalizedKey || !immediateUrl || !clipType;

  // ---------------------------------------------
  // Render
  // ---------------------------------------------
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
          type={clipType}
          url={immediateUrl}
          mediaRef={mediaRef}
        />
      )}
    </div>
  );
}

// ---------------------------------------------
// Media Renderer
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
