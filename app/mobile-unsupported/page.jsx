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

    video.play().catch(() => {
      // Autoplay was blocked — show a tap prompt
      setNeedsTap(true);
    });
  }, []);

  const handleTap = () => {
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
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        style={{
          maxWidth: "280px",
          width: "100%",
          marginBottom: "2rem",
        }}
      >
        <source src="/lanternwave-logo.mp4" type="video/mp4" />
      </video>

      {needsTap && (
        <p
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "0.85rem",
            marginBottom: "1rem",
            fontFamily: "system-ui, sans-serif",
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
        }}
      >
        LanternWave is not available on mobile.
        <br />
        Please visit on a computer, laptop, or tablet.
      </p>
    </div>
  );
}
