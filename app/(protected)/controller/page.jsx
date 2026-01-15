"use client";

import React, { useEffect, useState } from "react";
import { useGlobalAudio } from "@/components/GlobalAudio";
import "./controller.css";

function clipTypeFromKey(key) {
  const k = key.toLowerCase();
  if (k.endsWith(".mp3")) return "audio";
  if (k.endsWith(".mp4")) return "video";
  if (k.endsWith(".jpg") || k.endsWith(".jpeg") || k.endsWith(".png"))
    return "image";
  return "unknown";
}

/* ============================================================
   CONTROLLER PAGE
============================================================ */

function displayNameFromKey(key) {
  const parts = key.split("/");
  return parts[parts.length - 1].replace(/^\d+-/, "");
}

function streamUrlForKey(key) {
  return `/api/r2/stream?key=${encodeURIComponent(key)}`;
}

export default function ControllerPage() {
  const audio = useGlobalAudio();

  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/r2/list", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      setClips(data.rows || []);
      const np = await fetch("/api/r2/now-playing", {
        cache: "no-store",
        credentials: "include",
      }).then((r) => (r.ok ? r.json() : null));
      setNowPlaying(np?.nowPlaying || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const playingKey = nowPlaying?.key || audio?.currentKey || null;
  const previewKey = playingKey;
  const previewType = previewKey ? clipTypeFromKey(previewKey) : null;
  const previewUrl = previewKey ? streamUrlForKey(previewKey) : null;

  /* FIX: drive animation from actual playback */
  const isPlayingAudio =
    previewKey &&
    previewType === "audio" &&
    audio?.isPlaying;

  return (
    <div className="lw-main">
      <div className="lw-console">
        <section className="lw-panel">
          <h2 className="lw-panel-title">CLIP LIBRARY</h2>

          <div className="lw-clip-list">
            {clips.map((clip) => {
              const key = clip.object_key;
              const isNow = playingKey === key;
              const isBusy = busyKey === key || loading;

              return (
                <div
                  key={key}
                  className={`lw-clip-row ${
                    isNow ? "lw-clip-row-active" : ""
                  }`}
                >
                  <div className="lw-clip-main">
                    <span className="lw-clip-type">
                      {clipTypeFromKey(key).toUpperCase()}
                    </span>
                    <span className="lw-clip-name">
                      {displayNameFromKey(key)}
                    </span>
                  </div>

                  <div className="lw-clip-actions">
                    <button
                      className={`lw-btn loop-btn ${
                        audio?.loop ? "active" : ""
                      }`}
                      disabled={isBusy}
                      onClick={() => audio?.setLoop?.(!audio.loop)}
                    >
                      <span className="loop-icon">⟳</span>
                    </button>

                    <button
                      className="lw-btn"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyKey(key);
                        try {
                          await fetch("/api/r2/now-playing", {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ key }),
                          });
                          setNowPlaying({ key });
                          if (clipTypeFromKey(key) === "audio") {
                            audio.play(streamUrlForKey(key), key);
                          } else {
                            audio.stop();
                          }
                        } finally {
                          setBusyKey(null);
                        }
                      }}
                    >
                      PLAY
                    </button>

                    <button
                      className="lw-btn"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyKey(key);
                        try {
                          await fetch("/api/r2/now-playing", {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ key: null }),
                          });
                          setNowPlaying(null);
                          audio.stop();
                        } finally {
                          setBusyKey(null);
                        }
                      }}
                    >
                      STOP
                    </button>

                    <button
                      className="lw-btn lw-btn-danger"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyKey(key);
                        try {
                          await fetch(
                            `/api/r2/delete?key=${encodeURIComponent(key)}`,
                            { method: "DELETE", credentials: "include" }
                          );
                          await refresh();
                        } finally {
                          setBusyKey(null);
                        }
                      }}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lw-panel">
          <h2 className="lw-panel-title">PLAYER PREVIEW</h2>

          <div className="lw-preview-frame">
            {!previewKey && (
              <div className="lw-preview-placeholder">NO CLIP</div>
            )}

            {previewKey && previewType === "image" && (
              <img src={previewUrl} className="lw-preview-media" />
            )}

            {previewKey && previewType === "video" && (
              <video
                className="lw-preview-media"
                src={previewUrl}
                muted
                autoPlay
                loop={!!audio?.loop}
                playsInline
              />
            )}

            {previewKey && previewType === "audio" && (
              <div
                className={`lw-audio-visual ${
                  isPlayingAudio ? "playing" : ""
                }`}
              >
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
