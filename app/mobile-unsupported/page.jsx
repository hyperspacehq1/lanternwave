"use client";

import { useRef, useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function MobileUnsupportedPage() {
  const videoRef = useRef(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React doesn't reliably apply the `muted` attribute to the DOM.
    // iOS Safari will block autoplay unless the element is truly muted.
    video.muted = true;

    // Don't call video.play() here — iOS blocks play() inside useEffect
    // because it's not considered a user gesture. Instead, rely on the
    // `autoplay` attribute on the <video> tag. We only check if autoplay
    // was blocked so we can show the tap prompt.
    const onPlaying = () => setNeedsTap(false);
    video.addEventListener("playing", onPlaying);

    // If the video hasn't started after a short delay, assume autoplay was blocked
    const timeout = setTimeout(() => {
      if (video.paused) {
        setNeedsTap(true);
      }
    }, 500);

    return () => {
      video.removeEventListener("playing", onPlaying);
      clearTimeout(timeout);
    };
  }, []);

  const handleTap = () => {
    // .play() called directly from a user tap — iOS allows this
    const video = videoRef.current;
    if (video) {
      video.play();
      setNeedsTap(false);
    }
  };

  return (
    <div
      onClick={needsTap ? handleTap : undefined}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        padding: "2rem",
        textAlign: "center",
        cursor: needsTap ? "pointer" : "default",
      }}
    >
      {/* 
        iOS autoplay rules:
        - autoplay + muted + playsInline + webkit-playsinline
        - src directly on <video> (more reliable than nested <source>)
      */}
      <video
        ref={videoRef}
        src="/lanternwave-logo.mp4"
        autoPlay
        loop
        muted
        playsInline
        webkit-playsinline=""
        style={{
          maxWidth: "280px",
          width: "100%",
          marginBottom: "2rem",
        }}
      />

      {needsTap && (
        <p
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "0.85rem",
            marginBottom: "1rem",
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "none", // prevent iOS tap interception
          }}
        >
          Tap anywhere to play
        </p>
      )}

      <p
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "1rem",
          lineHeight: 1.5,
          maxWidth: "300px",
          fontFamily: "system-ui, sans-serif",
          pointerEvents: "none", // prevent iOS tap interception
        }}
      >
        LanternWave is not available on mobile.
        <br />
        Please visit on a computer, laptop, or tablet.
      </p>
    </div>
  );
}
