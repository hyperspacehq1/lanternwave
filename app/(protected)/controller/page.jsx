"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGlobalAudio } from "@/components/GlobalAudio";
import "./controller.css";

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

function displayNameFromKey(key) {
  const parts = key.split("/");
  return parts[parts.length - 1].replace(/^\d+-/, "");
}

function streamUrlForKey(key) {
  return `/api/r2/stream?key=${encodeURIComponent(key)}`;
}

/* ================================
   Controller Page
================================ */
export default function ControllerPage() {
  const audio = useGlobalAudio();
  const glowRef = useRef(0);

  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [mediaFilter, setMediaFilter] = useState("all");

  /* ------------------------------
     Load clips
  ------------------------------ */
  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/r2/list", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setClips(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  /* ------------------------------
     Waveform + Beat Visualizer
  ------------------------------ */
  useEffect(() => {
    if (!audio?.visualizerRef?.current || !audio?.analyser?.current) return;

    const canvas = audio.visualizerRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = audio.analyser.current;
    const buffer = audio.dataArray.current;

    let raf;

    function draw() {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      let energy = 0;

      if (audio.isPlayingRef.current) {
        analyser.getByteTimeDomainData(buffer);

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(108,197,240,${0.6 + glowRef.current})`;

        const slice = width / buffer.length;
        let x = 0;

        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128.0;
          const y = (v * height) / 2;
          energy += Math.abs(v - 1);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          x += slice;
        }

        ctx.stroke();
        glowRef.current = Math.min(0.8, (energy / buffer.length) * 3);
      } else {
        const t = Date.now() * 0.002;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(108,197,240,0.25)";
        ctx.lineWidth = 1.5;

        for (let x = 0; x < width; x += 4) {
          const y =
            height / 2 + Math.sin(t + x * 0.05) * (height * 0.12);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        ctx.stroke();
        glowRef.current *= 0.9;
      }

      glowRef.current *= 0.9;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [audio]);

  /* ------------------------------
     Derived
  ------------------------------ */
  const filteredClips = clips.filter((c) =>
    mediaFilter === "all"
      ? true
      : clipTypeFromKey(c.object_key) === mediaFilter
  );

  const playingKey = nowPlaying?.key || audio.currentKey;
  const previewKey = playingKey;
  const previewType = previewKey ? clipTypeFromKey(previewKey) : null;
  const previewUrl = previewKey ? streamUrlForKey(previewKey) : null;

  /* ================================
     RENDER
  =============================== */
  return (
    <div className="lw-main">
      <div className="lw-console">
        {/* CLIP LIBRARY */}
        <section className="lw-panel">
          <h2 className="lw-panel-title">CLIP LIBRARY</h2>

          <div className="lw-clip-filters">
            {[
              ["all", "ALL"],
              ["audio", "MUSIC"],
              ["image", "IMAGES"],
              ["video", "VIDEOS"],
            ].map(([k, label]) => (
              <button
                key={k}
                className={`lw-btn ${mediaFilter === k ? "active" : ""}`}
                onClick={() => setMediaFilter(k)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="lw-clip-list">
            {filteredClips.map((clip) => {
              const key = clip.object_key;
              const isNow = playingKey === key;
              const isBusy = busyKey === key;

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
                        audio.loop && isNow ? "active" : ""
                      }`}
                      onClick={() => audio.setLoop(!audio.loop)}
                    >
                      ⟳
                    </button>

                    <button
                      className="lw-btn"
                      onClick={async () => {
                        setBusyKey(key);
                        audio.play(previewUrl, key);
                        setNowPlaying({ key });
                        setBusyKey(null);
                      }}
                    >
                      PLAY
                    </button>

                    <button
                      className="lw-btn"
                      onClick={() => {
                        audio.stop();
                        setNowPlaying(null);
                      }}
                    >
                      STOP
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PLAYER PREVIEW */}
        <section className="lw-panel">
          <h2 className="lw-panel-title">PLAYER PREVIEW</h2>

          <div className="lw-preview-frame">
            {!previewKey && <div className="lw-preview-placeholder">NO CLIP</div>}

            {previewType === "image" && (
              <img src={previewUrl} alt="preview" />
            )}

            {previewType === "video" && (
              <video src={previewUrl} autoPlay muted loop playsInline />
            )}

            {previewType === "audio" && (
              <canvas
                ref={audio.visualizerRef}
                className="lw-audio-waveform"
                width={360}
                height={100}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
