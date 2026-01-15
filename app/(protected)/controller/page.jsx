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

  /* ------------------------------
     WAVEFORM + BEAT VISUALIZER
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
        ctx.strokeStyle = `rgba(108,197,240,${0.7 + glowRef.current})`;

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

        // Beat detection → glow
        const beat = energy / buffer.length;
        glowRef.current = Math.min(0.8, beat * 3);
      } else {
        // Idle waveform (breathing line)
        const t = Date.now() * 0.002;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(108,197,240,0.25)";
        ctx.lineWidth = 1.5;

        for (let x = 0; x < width; x += 4) {
          const y =
            height / 2 +
            Math.sin(t + x * 0.05) * (height * 0.12);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        ctx.stroke();
        glowRef.current *= 0.92;
      }

      // Glow decay
      glowRef.current *= 0.9;

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [audio]);

  /* ------------------------------
     UI + EXISTING LOGIC (UNCHANGED)
  ------------------------------ */
  const [clips, setClips] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);

  useEffect(() => {
    fetch("/api/r2/list", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setClips(d.rows || []));
  }, []);

  const playingKey = nowPlaying?.key || audio.currentKey;
  const previewKey = playingKey;
  const previewType = previewKey ? clipTypeFromKey(previewKey) : null;

  return (
    <div className="lw-main">
      <section className="lw-panel">
        <h2 className="lw-panel-title">PLAYER PREVIEW</h2>

        <div className="lw-preview-frame">
          {previewKey && previewType === "audio" && (
            <canvas
              ref={audio.visualizerRef}
              className="lw-audio-waveform"
              width={320}
              height={100}
            />
          )}
        </div>
      </section>
    </div>
  );
}
