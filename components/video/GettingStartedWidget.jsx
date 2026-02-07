"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./GettingStartedWidget.css";

/* ──────────────────────────────────────────────────────────────
   GettingStartedWidget
   ──────────────────────────────────────────────────────────────
   Overlay video walkthrough shown on GM Dashboard.

   Visibility rules
   ────────────────
   1. Hidden forever  → user clicked "Don't show again"
                         → persisted to `users.hide_getting_started` via API
   2. Hidden this session → user clicked ✕
                         → module-level flag (resets on full page load / login)
   3. Visible          → new login / new session, flag not set in DB

   Props
   ─────
   • videoSrc        – URL for the walkthrough video
   • captionsSrc     – URL for a WebVTT (.vtt) captions file  (optional)
   • steps           – array of { time, label, cta? }         (optional)
                        time  = seconds into the video
                        label = text shown in the step bar
                        cta   = { label, href } for a product-action button
   • onDismissForever – callback after the API confirms the flag was saved
   ────────────────────────────────────────────────────────────── */

/* Module-level flag — survives SPA navigation but resets on
   full page load (i.e. login), which is exactly what we want. */
let dismissedThisSession = false;

export default function GettingStartedWidget({
  videoSrc = "/videos/lanternwave.mp4",
  captionsSrc = "",
  steps = [],
  onDismissForever,
}) {
  /* ── Visibility ────────────────────────────────────── */
  const [visible, setVisible] = useState(false);
  const [dbDismissed, setDbDismissed] = useState(null); // null = loading

  // On mount: check DB flag + session flag
  useEffect(() => {
    // 1️⃣ Check database flag
    fetch("/api/account", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const hidden = !!d?.account?.hide_getting_started;
        setDbDismissed(hidden);
        if (hidden) return;

        // 2️⃣ Check session flag
        if (dismissedThisSession) return;

        setVisible(true);
      })
      .catch(() => {
        setDbDismissed(false);
        if (dismissedThisSession) return;
        setVisible(true);
      });
  }, []);

  /* ── Video state ───────────────────────────────────── */
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  /* ── Drag state (mirrors PlayerCharactersWidget) ──── */
  const widgetRef = useRef(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const MARGIN = 16;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Center on first render
  const [pos, setPos] = useState({ x: null, y: null });

  useEffect(() => {
    if (pos.x !== null) return;
    const w = Math.min(640, window.innerWidth - 64);
    setPos({
      x: Math.round((window.innerWidth - w) / 2),
      y: Math.max(MARGIN, Math.round(window.innerHeight * 0.1)),
    });
  }, [pos.x]);

  /* ── Drag handlers ─────────────────────────────────── */
  function onDragStart(e) {
    dragging.current = true;
    const r = widgetRef.current.getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    widgetRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging.current) return;
    const r = widgetRef.current?.getBoundingClientRect();
    const w = r?.width ?? 640;
    const h = r?.height ?? 400;
    setPos({
      x: clamp(e.clientX - dragOffset.current.dx, MARGIN, window.innerWidth - w - MARGIN),
      y: clamp(e.clientY - dragOffset.current.dy, MARGIN, window.innerHeight - h - MARGIN),
    });
  }

  function onPointerUp(e) {
    dragging.current = false;
    try { widgetRef.current?.releasePointerCapture(e.pointerId); } catch {}
  }

  /* ── Video helpers ─────────────────────────────────── */
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const skip = useCallback((sec) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = clamp(v.currentTime + sec, 0, v.duration || 0);
  }, []);

  const changeRate = useCallback(() => {
    const rates = [0.5, 1, 1.25, 1.5, 2];
    const idx = rates.indexOf(playbackRate);
    const next = rates[(idx + 1) % rates.length];
    if (videoRef.current) videoRef.current.playbackRate = next;
    setPlaybackRate(next);
  }, [playbackRate]);

  const toggleCaptions = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.textTracks.length) return;
    const track = v.textTracks[0];
    const on = track.mode !== "showing";
    track.mode = on ? "showing" : "hidden";
    setCaptionsOn(on);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = widgetRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Sync fullscreen state on exit via Esc etc
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── Time update / step tracking ───────────────────── */
  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);

    // Track which step we're on
    if (steps.length) {
      for (let i = steps.length - 1; i >= 0; i--) {
        if (v.currentTime >= steps[i].time) { setCurrentStep(i); break; }
      }
    }
  }

  function onLoadedMetadata() {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  }

  function onVideoEnded() {
    setPlaying(false);
  }

  /* ── Progress bar seek ─────────────────────────────── */
  function seekFromProgress(e) {
    const bar = progressRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;
    const rect = bar.getBoundingClientRect();
    const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    v.currentTime = pct * v.duration;
  }

  /* ── Navigate steps ────────────────────────────────── */
  function goToStep(idx) {
    const v = videoRef.current;
    if (!v || !steps[idx]) return;
    v.currentTime = steps[idx].time;
    setCurrentStep(idx);
    if (v.paused) { v.play(); setPlaying(true); }
  }

  /* ── Dismiss handlers ──────────────────────────────── */
  function dismissSession() {
    dismissedThisSession = true;
    setVisible(false);
  }

  async function dismissForever() {
    try {
      await fetch("/api/account/dismiss-getting-started", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    dismissedThisSession = true;
    setDbDismissed(true);
    setVisible(false);
    onDismissForever?.();
  }

  /* ── Format mm:ss ──────────────────────────────────── */
  function fmt(sec) {
    if (!Number.isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  /* ── Render ────────────────────────────────────────── */
  if (!visible || dbDismissed) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const step = steps[currentStep];
  const hasNext = currentStep < steps.length - 1;

  return (
    <>
      {/* backdrop overlay */}
      <div className="gs-widget__backdrop" onClick={dismissSession} />

      <div
        ref={widgetRef}
        className={`gs-widget ${isFullscreen ? "gs-widget--fullscreen" : ""}`}
        style={
          isFullscreen
            ? {}
            : {
                position: "fixed",
                left: pos.x ?? "50%",
                top: pos.y ?? "10%",
                zIndex: 9999,
              }
        }
      >
        {/* ─── HEADER ─── */}
        <div
          className="gs-widget__header"
          onPointerDown={onDragStart}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="gs-widget__title">Lanternwave Overview</div>

          <div className="gs-widget__header-controls">
            <button
              className="gs-widget__icon"
              title="Don't show again"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={dismissForever}
            >
              {/* eye-off icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c542" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>

            <button
              className="gs-widget__icon"
              title="Close"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={dismissSession}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5c542" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── VIDEO ─── */}
        <div className="gs-widget__video-wrap" onClick={togglePlay}>
          <video
            ref={videoRef}
            src={videoSrc}
            preload="metadata"
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={onVideoEnded}
            playsInline
          >
            {captionsSrc && (
              <track kind="captions" src={captionsSrc} srcLang="en" label="English" />
            )}
          </video>

          {/* big center play overlay when paused */}
          {!playing && (
            <div className="gs-widget__play-overlay">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="27" stroke="rgba(245,197,66,0.6)" strokeWidth="2" />
                <polygon points="22,16 42,28 22,40" fill="#f5c542" />
              </svg>
            </div>
          )}
        </div>

        {/* ─── PROGRESS BAR ─── */}
        <div
          className="gs-widget__progress"
          ref={progressRef}
          onPointerDown={(e) => { e.stopPropagation(); seekFromProgress(e); }}
          onPointerMove={(e) => { if (e.buttons === 1) seekFromProgress(e); }}
        >
          <div className="gs-widget__progress-fill" style={{ width: `${progressPct}%` }} />
          {/* step markers */}
          {steps.map((s, i) =>
            duration > 0 ? (
              <div
                key={i}
                className="gs-widget__step-marker"
                style={{ left: `${(s.time / duration) * 100}%` }}
                title={s.label}
              />
            ) : null
          )}
        </div>

        {/* ─── CONTROLS ─── */}
        <div className="gs-widget__controls" onPointerDown={(e) => e.stopPropagation()}>
          <div className="gs-widget__controls-left">
            {/* Play / Pause */}
            <button className="gs-widget__ctrl-btn" onClick={togglePlay} title={playing ? "Pause" : "Play"}>
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#f5c542">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#f5c542">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              )}
            </button>

            {/* Skip back 10s */}
            <button className="gs-widget__ctrl-btn" onClick={() => skip(-10)} title="Back 10s">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c542" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>

            {/* Skip forward 10s */}
            <button className="gs-widget__ctrl-btn" onClick={() => skip(10)} title="Forward 10s">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c542" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
              </svg>
            </button>

            {/* Mute */}
            <button className="gs-widget__ctrl-btn" onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
              {muted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c542" strokeWidth="2" strokeLinecap="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19" fill="#f5c542" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c542" strokeWidth="2" strokeLinecap="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19" fill="#f5c542" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            {/* Time */}
            <span className="gs-widget__time">{fmt(currentTime)} / {fmt(duration)}</span>
          </div>

          <div className="gs-widget__controls-right">
            {/* Captions */}
            {captionsSrc && (
              <button
                className={`gs-widget__ctrl-btn ${captionsOn ? "active" : ""}`}
                onClick={toggleCaptions}
                title={captionsOn ? "Captions off" : "Captions on"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c542" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M7 12h2" />
                  <path d="M15 12h2" />
                </svg>
              </button>
            )}

            {/* Speed */}
            <button className="gs-widget__ctrl-btn gs-widget__speed-btn" onClick={changeRate} title="Playback speed">
              {playbackRate}×
            </button>

            {/* Fullscreen */}
            <button className="gs-widget__ctrl-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {isFullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c542" strokeWidth="2" strokeLinecap="round">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c542" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ─── STEP BAR (only if steps provided) ─── */}
        {steps.length > 0 && (
          <div className="gs-widget__steps">
            <div className="gs-widget__steps-list">
              {steps.map((s, i) => (
                <button
                  key={i}
                  className={`gs-widget__step-btn ${i === currentStep ? "active" : ""} ${
                    i < currentStep ? "done" : ""
                  }`}
                  onClick={() => goToStep(i)}
                >
                  <span className="gs-widget__step-num">{i + 1}</span>
                  <span className="gs-widget__step-label">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Next / CTA */}
            <div className="gs-widget__step-actions">
              {step?.cta && (
                <a
                  href={step.cta.href}
                  className="gs-widget__cta-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {step.cta.label}
                </a>
              )}

              {hasNext && (
                <button
                  className="gs-widget__next-btn"
                  onClick={() => goToStep(currentStep + 1)}
                >
                  Next Step →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}


