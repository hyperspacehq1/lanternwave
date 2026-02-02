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
   MEDIA PACKS (DATA ONLY)
   - Scale to 100+ packs by adding entries
   - Later: replace with API fetch without changing JSX
================================ */
const MEDIA_PACKS = [
  { id: "frozen-sick", label: "Frozen Sick" },
  // Add more:
  // { id: "pack-id", label: "Pack Label" },
];

/* ================================
   Image size enforcement
================================ */
const MAX_IMAGE_DIMENSION = 2048;

function validateImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        reject(
          new Error(
            "Your image is too large. Please compress it or resize dimensions to under 2048 × 2048 pixels before uploading."
          )
        );
      } else {
        resolve(true);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Invalid image file"));
    };

    img.src = objectUrl;
  });
}

/* ================================
   API helpers
================================ */
async function listClips() {
  const res = await fetch("/api/r2/list", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Not authenticated");
  const data = await res.json();
  return data.rows || [];
}

async function deleteClip(key) {
  const res = await fetch(`/api/r2/delete?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Delete failed");
}

async function uploadClip(file, onProgress) {
  const urlRes = await fetch("/api/r2/upload-url", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ filename: file.name, size: file.size }),
    headers: { "Content-Type": "application/json" },
  });

  const urlData = await urlRes.json().catch(() => null);

  if (!urlRes.ok || !urlData?.uploadUrl || !urlData?.key) {
    throw new Error(
      urlData?.error ||
        `Upload initialization failed (status ${urlRes.status})`
    );
  }

  const { uploadUrl, key } = urlData;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload to storage failed"));

    xhr.onerror = () => reject(new Error("Upload to storage failed"));

    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

  const finRes = await fetch("/api/r2/finalize", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ key }),
    headers: { "Content-Type": "application/json" },
  });

  if (!finRes.ok) throw new Error("Finalize failed");

  return key;
}

async function getNowPlaying() {
  const res = await fetch("/api/r2/now-playing", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.nowPlaying || null;
}

async function setNowPlaying(key) {
  const res = await fetch("/api/r2/now-playing", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ key }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Not authenticated");
  const data = await res.json();
  return data.nowPlaying || null;
}

/* ================================
   Controller Page
================================ */
export default function ControllerPage() {
  const audio = useGlobalAudio();

  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [nowPlaying, setNowPlayingState] = useState(null);
  const [mediaFilter, setMediaFilter] = useState("all");

  // Keep the waveform visible after STOP (idle waveform)
  const lastAudioKeyRef = useRef(null);

  // Beat glow state (canvas-only, no React re-render)
  const glowRef = useRef(0);

  const filteredClips = clips.filter((clip) => {
    if (mediaFilter === "all") return true;
    return clipTypeFromKey(clip.object_key) === mediaFilter;
  });

  async function refresh() {
    setLoading(true);
    try {
      const result = await listClips();
      const rows = Array.isArray(result) ? result : [];
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setClips(rows);
      setNowPlayingState(await getNowPlaying());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const playingKey = nowPlaying?.key || audio?.currentKey || null;

  // Preview logic (existing behavior)
  const previewKey = playingKey;
  const previewType = previewKey ? clipTypeFromKey(previewKey) : null;
  const previewUrl = previewKey ? streamUrlForKey(previewKey) : null;

  // If we STOP, previewKey becomes null; keep idle waveform if last played was audio
  const showWaveform =
    previewType === "audio" || (previewKey == null && !!lastAudioKeyRef.current);

  /* ------------------------------
     Waveform + Beat-synced glow + Idle waveform
  ------------------------------ */
  useEffect(() => {
    if (!showWaveform) return;
    if (!audio?.visualizerRef?.current) return;
    if (!audio?.analyser?.current || !audio?.dataArray?.current) return;

    const canvas = audio.visualizerRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = audio.analyser.current;
    const buffer = audio.dataArray.current;

    let rafId = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const isPlaying = !!audio?.isPlayingRef?.current;

      if (isPlaying) {
        analyser.getByteTimeDomainData(buffer);

        // Energy estimate for beat-ish pulse (simple + stable)
        let energy = 0;

        // Glow
        ctx.save();
        ctx.shadowColor = "rgba(108,197,240,1)";
        ctx.shadowBlur = 6 + glowRef.current * 28;

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(108,197,240,${0.55 + glowRef.current})`;

        const slice = w / buffer.length;
        let x = 0;

        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128.0; // ~0..2
          const centered = v - 1; // ~-1..1
          const y = h / 2 + centered * (h * 0.42);

          energy += Math.abs(centered);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += slice;
        }

        ctx.stroke();
        ctx.restore();

        // Beat pulse (normalized-ish)
        const beat = energy / buffer.length; // ~0..something small
        const target = Math.min(0.9, beat * 3.2);
        glowRef.current = glowRef.current * 0.75 + target * 0.25;
      } else {
        // Idle waveform (breathing line)
        const t = Date.now() * 0.002;
        const amp = h * (0.08 + 0.02 * Math.sin(t * 0.7));

        ctx.beginPath();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "rgba(108,197,240,0.25)";

        for (let x = 0; x <= w; x += 4) {
          const y = h / 2 + Math.sin(t + x * 0.04) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();

        // Fade glow down when idle
        glowRef.current *= 0.9;
      }

      // Always decay a bit
      glowRef.current *= 0.92;

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [audio, showWaveform, playingKey]);

  return (
    <div className="lw-main">
      <div className="lw-console">
        {/* Upload */}
        <section className="lw-panel">
          <h2 className="lw-panel-title">UPLOAD CLIP</h2>

          <label className={`lw-file-button ${loading ? "disabled" : ""}`}>
            SELECT FILE
            <input
              type="file"
              disabled={loading}
              accept=".mp3,.mp4,.jpg,.jpeg,.png"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || loading) return;

                setUploadProgress(0);
                setUploadError(null);
                setLoading(true);

                try {
                  if (file.type.startsWith("image/")) {
                    await validateImageDimensions(file);
                  }

                  await uploadClip(file, setUploadProgress);
                  setUploadProgress(null);
                  e.target.value = "";
                  await refresh();
                } catch (err) {
                  console.error("[upload]", err);
                  setUploadError(err?.message || "Upload failed");
                  setUploadProgress(null);
                } finally {
                  setLoading(false);
                }
              }}
            />
          </label>

          {/* MEDIA PACKS (new, scalable) */}
          <div className="lw-media-packs">
            <div className="lw-media-packs-title">MEDIA PACKS</div>

            {MEDIA_PACKS.map((pack) => (
              <button
                key={pack.id}
                className="lw-media-pack"
                onClick={() => {
                  window.location.href = `/api/media-packs/${pack.id}`;
                }}
              >
                {pack.label}
              </button>
            ))}
          </div>

          {uploadProgress !== null && (
            <div className="lw-upload-progress">
              <div
                className="lw-upload-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {uploadError && <div className="lw-upload-error">{uploadError}</div>}
        </section>

        {/* CLIP LIBRARY */}
        <section className="lw-panel">
          <h2 className="lw-panel-title">CLIP LIBRARY</h2>

          <div className="lw-clip-filters">
            {[
              ["all", "ALL MEDIA"],
              ["image", "IMAGES"],
              ["audio", "MUSIC"],
              ["video", "VIDEOS"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`lw-btn ${mediaFilter === key ? "active" : ""}`}
                onClick={() => setMediaFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {loading && <div className="lw-loading">Loading clips…</div>}

          <div className="lw-clip-list">
            {filteredClips.map((clip) => {
              const key = clip.object_key;
              const isNow = playingKey === key;
              const isBusy = busyKey === key || loading;

              return (
                <div
                  key={key}
                  className={`lw-clip-row ${isNow ? "lw-clip-row-active" : ""}`}
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
                        audio?.loop && isNow ? "active" : ""
                      }`}
                      disabled={isBusy || clipTypeFromKey(key) === "video" || clipTypeFromKey(key) === "image"}
                      onClick={() => {
                        if (!audio?.setLoop) return;
                        audio.setLoop(!audio.loop);
                      }}
                    >
                      ⟳
                    </button>

                    <button
                      className="lw-btn"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyKey(key);
                        try {
                          await setNowPlaying(key);
                          setNowPlayingState({ key });

                          const type = clipTypeFromKey(key);
                          if (type === "audio") {
                            lastAudioKeyRef.current = key; // remember last audio for idle waveform
                            if (audio?.setLoop) audio.setLoop(!!audio.loop);
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
                          await setNowPlaying(null);
                          setNowPlayingState(null);
                          audio.stop(); // stops audio + sets isPlayingRef false
                          // keep lastAudioKeyRef so waveform idles instead of disappearing
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
                          await deleteClip(key);
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

        {/* PLAYER PREVIEW */}
        <section className="lw-panel">
          <h2 className="lw-panel-title">PLAYER PREVIEW</h2>

          <div className="lw-preview-frame">
            {!previewKey && !showWaveform && (
              <div className="lw-preview-placeholder">NO CLIP</div>
            )}

            {previewKey && previewType === "image" && (
              <img
                src={previewUrl}
                className="lw-preview-media"
                alt="preview"
              />
            )}

            {previewKey && previewType === "video" && (
              <video
                className="lw-preview-media"
                src={previewUrl}
                autoPlay
                loop={!!audio?.loop}
                playsInline
                onEnded={async () => {
                  // Auto-stop when video ends (if not looping)
                  if (!audio?.loop) {
                    await setNowPlaying(null);
                    setNowPlayingState(null);
                    audio.stop();
                  }
                }}
              />
            )}

            {showWaveform && (
              <canvas
                ref={audio?.visualizerRef}
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
