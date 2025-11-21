// src/pages/PlayerPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { getNowPlaying, streamUrlForKey } from "../lib/api.js";
import { clipTypeFromKey } from "../lib/ui.js";

export default function PlayerPage() {
  const [nowPlaying, setNowPlaying] = useState(null); // raw from API
  const [tick, setTick] = useState(0);
  const [debug, setDebug] = useState({
    lastFetchAt: null,
    lastError: null,
    raw: null,
    normalizedKey: null,
  });
  const [showDebug, setShowDebug] = useState(false);
  const mediaRef = useRef(null);

  // Toggle debug overlay with "D"
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "d" || e.key === "D") {
        setShowDebug((s) => !s);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Poll now-playing
  useEffect(() => {
    let cancelled = false;

    async function fetchNowPlaying() {
      try {
        const np = await getNowPlaying(); // payload object or null
        if (cancelled) return;

        console.log("[LW Player] getNowPlaying ->", np);
        setNowPlaying(np ?? null);

        const normalizedKey = deriveKey(np);
        setDebug((prev) => ({
          ...prev,
          lastFetchAt: new Date().toISOString(),
          lastError: null,
          raw: np ?? null,
          normalizedKey,
        }));
      } catch (err) {
        console.error("[LW Player] getNowPlaying error", err);
        if (cancelled) return;
        setDebug((prev) => ({
          ...prev,
          lastFetchAt: new Date().toISOString(),
          lastError: String(err),
        }));
      }
    }

    fetchNowPlaying();
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      fetchNowPlaying();
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const normalizedKey = deriveKey(nowPlaying);
  const clipType = normalizedKey
    ? clipTypeFromKey(normalizedKey.replace(/^clips\//, ""))
    : null;

  let url = null;
  if (normalizedKey) {
    try {
      url = streamUrlForKey(normalizedKey);
    } catch (err) {
      console.error("[LW Player] streamUrlForKey error", err);
      setDebug((prev) => ({
        ...prev,
        lastError: "streamUrlForKey error: " + String(err),
      }));
    }
  }

  // If we lose signal, reset media element
  useEffect(() => {
    if (!normalizedKey && mediaRef.current) {
      try {
        mediaRef.current.pause();
        mediaRef.current.removeAttribute("src");
        mediaRef.current.load();
      } catch (e) {
        console.warn("[LW Player] failed to reset media element", e);
      }
    }
  }, [normalizedKey]);

  const showNoSignal = !normalizedKey || !url || !clipType;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "black",
        overflow: "hidden",
        position: "relative",
        fontFamily: "MU_TH_UR, system-ui, sans-serif",
      }}
    >
      {showNoSignal ? (
        <NoSignalPattern tick={tick} debug={debug} />
      ) : (
        <ActiveMedia type={clipType} url={url} mediaRef={mediaRef} />
      )}

      {showDebug && (
        <DebugOverlay
          tick={tick}
          normalizedKey={normalizedKey}
          nowPlaying={nowPlaying}
          debug={debug}
        />
      )}
    </div>
  );
}

/**
 * Normalize any nowPlaying shape into a full "clips/<file>" key.
 * Handles:
 *  - { key: "file.mp4" }
 *  - { key: "clips/file.mp4" }
 *  - { nowPlaying: { key: "file.mp4" } }  (legacy)
 *  - "file.mp4#loop3" (removes #loop suffix)
 */
function deriveKey(np) {
  if (!np) return null;

  let key = null;

  if (typeof np.key === "string") {
    key = np.key;
  } else if (np.nowPlaying && typeof np.nowPlaying.key === "string") {
    // legacy shape fallback
    key = np.nowPlaying.key;
  }

  if (!key) return null;
  key = key.trim();
  if (!key) return null;

  // Strip loop info: "file.mp4#loop3" -> "file.mp4"
  const withoutLoop = key.split("#")[0].trim();

  // Ensure we have exactly one "clips/" prefix
  const bare = withoutLoop.replace(/^clips\//, "");
  const full = "clips/" + bare;

  return full;
}

function ActiveMedia({ type, url, mediaRef }) {
  if (type === "image") {
    console.log("[LW Player] rendering IMAGE", url);
    return (
      <img
        src={url}
        alt="Lanternwave Player"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    );
  }

  if (type === "video") {
    console.log("[LW Player] rendering VIDEO", url);
    return (
      <video
        ref={mediaRef}
        src={url}
        autoPlay
        playsInline
        muted // iOS autoplay requirement; audio comes from host Mac
        controls={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    );
  }

  if (type === "audio") {
    console.log("[LW Player] rendering AUDIO", url);
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at center, #222 0%, #000 60%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "flex-end",
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="lw-audio-bar-player"
              style={{
                width: "8px",
                height: `${20 + i * 8}px`,
                background: "#3affaa",
                animation: "lw-audio-bar-bounce 1s infinite ease-in-out",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
        <audio
          ref={mediaRef}
          src={url}
          autoPlay
          controls={false}
          style={{ display: "none" }}
        />
      </div>
    );
  }

  console.warn("[LW Player] unknown type", type, "for url", url);
  return (
    <div
      style={{
        color: "#ccc",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      UNSUPPORTED CLIP TYPE
    </div>
  );
}

function NoSignalPattern({ tick, debug }) {
  const colors = ["#3affaa", "#ff3a5c", "#ffd93a", "#3aa7ff", "#ff9f3a"];
  const color = colors[tick % colors.length];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background:
          "repeating-linear-gradient( to bottom, #050505 0px, #050505 2px, #000000 3px, #000000 4px )",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          border: "4px solid " + color,
          padding: "24px 40px",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.3em",
          color: color,
          boxShadow: "0 0 32px " + color,
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.95) 70%)",
        }}
      >
        <div style={{ fontSize: "14px", marginBottom: "8px" }}>
          LANTERNWAVE PLAYER
        </div>
        <div style={{ fontSize: "26px", marginBottom: "6px" }}>NO SIGNAL</div>
        <div style={{ fontSize: "10px", opacity: 0.8 }}>
          WAITING FOR HOST CONSOLE...
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 12,
          fontSize: "9px",
          color: "#7f7f7f",
          textAlign: "right",
          opacity: 0.7,
        }}
      >
        TICK #{tick}
        <br />
        LAST KEY:{" "}
        {debug?.normalizedKey || debug?.raw?.key || "none"}
      </div>
    </div>
  );
}

function DebugOverlay({ tick, normalizedKey, nowPlaying, debug }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 8,
        bottom: 8,
        maxWidth: "50vw",
        padding: "8px 10px",
        background: "rgba(0,0,0,0.7)",
        color: "#e0e0e0",
        fontSize: "10px",
        border: "1px solid #444",
        borderRadius: "4px",
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        LW PLAYER DEBUG (press "D" to toggle)
      </div>
      <div>tick: {tick}</div>
      <div>normalizedKey: {normalizedKey || "null"}</div>
      <div>
        raw nowPlaying:{" "}
        {nowPlaying ? JSON.stringify(nowPlaying) : "null"}
      </div>
      <div>lastFetchAt: {debug?.lastFetchAt || "n/a"}</div>
      <div>lastError: {debug?.lastError || "none"}</div>
    </div>
  );
}
