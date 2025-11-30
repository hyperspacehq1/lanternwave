// src/pages/AccessGate.jsx
import React, { useEffect, useState } from "react";
import PrivacyPolicy from "./PrivacyPolicy.jsx";
import "./access-gate.css";

const ACCESS_CODE = "10241972";
const TYPE_SPEED = 15;
const MAX_VISIBLE_LINES = 10;

const BOOT_LINES = [
  "BOOTING SECURE OPERATIONS TERMINAL v7.9...",
  "",
  "INITIALIZING CORE SYSTEMS...",
  "",
  "ESTABLISHING ENCRYPTED NETWORK LINK……",
  "✓ HANDSHAKE ACCEPTED",
  "✓ QUANTUM CHANNEL STABILIZED",
  "✓ COUNTERMEASURE SUITE: ARMED",
  "",
  "VERIFYING USER CLEARANCE…",
  "LEVEL: OMEGA-BLACK",
  "STATUS: AUTHORIZED",
  "ACCESS WINDOW: 24 HOURS",
  "",
  "LOADING PROTOCOL STACKS…",
  "- SIGNAL SCRAMBLER: ONLINE",
  "- BIOSIGNATURE TRACKER: ONLINE",
  "- COVERT TELEMETRY NEXUS: ACTIVE",
  "- INTERNAL AUDIT DAEMON: STANDBY",
  "",
  "DECRYPTING CLASSIFIED MODULES…",
  "███████▒▒▒▒▒▒▒ 41%",
  "███████████▒▒▒ 78%",
  "██████████████ 100%",
  "",
  "WARNING: THIS TERMINAL IS MONITORED",
  "ALL ACTIONS ARE LOGGED IN REAL TIME",
  "",
  "ANOMALY SCAN: CLEAR",
  "SURVEILLANCE BLIND SPOT INITIATED",
  "",
  ">>> SYSTEM READY",
  "ENTER ACCESS CODE TO CONTINUE"
];

export default function AccessGate({ onUnlock }) {
  const [stage, setStage] = useState("intro");
  const [bootLines, setBootLines] = useState([]);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Boot typing effect
  useEffect(() => {
    if (stage !== "boot") return;

    let lineIndex = 0;
    let charIndex = 0;
    let currentLines = [];

    const interval = setInterval(() => {
      if (lineIndex >= BOOT_LINES.length) {
        setBootLines([...currentLines]);
        clearInterval(interval);
        setTimeout(() => setStage("code"), 400);
        return;
      }

      const fullLine = BOOT_LINES[lineIndex] ?? "";

      if (currentLines[lineIndex] === undefined) {
        currentLines[lineIndex] = "";
      }

      currentLines[lineIndex] += fullLine.charAt(charIndex);

      if (charIndex >= fullLine.length) {
        lineIndex += 1;
        charIndex = 0;
      } else {
        charIndex += 1;
      }

      setBootLines([...currentLines]);
    }, TYPE_SPEED);

    return () => clearInterval(interval);
  }, [stage]);

  // Auto-fade after approval
  useEffect(() => {
    if (stage !== "approved") return;
    const t = setTimeout(() => onUnlock && onUnlock(), 1200);
    return () => clearTimeout(t);
  }, [stage, onUnlock]);

  const visibleLines = bootLines.slice(-MAX_VISIBLE_LINES);

  const handleInitialize = () => {
    if (stage === "intro") setStage("boot");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim() === ACCESS_CODE) {
      setError("");
      setStage("approved");
    } else {
      setError("ACCESS DENIED");
      setTimeout(() => setError(""), 1500);
    }
  };

  return (
    <div className={`boot-screen ${stage === "approved" ? "boot-screen-fade" : ""}`}>

      {/* Top-right PRIVACY POLICY button */}
      <button
        type="button"
        className="boot-privacy-button"
        onClick={() => setShowPrivacy(true)}
      >
        PRIVACY POLICY
      </button>

      {/* Intro screen */}
      {stage === "intro" && (
        <div className="boot-intro" onClick={handleInitialize}>
          <div className="boot-logo-wrap">
            <img src="/lanterwave-logo.png" alt="LanternWave" className="boot-logo" />
          </div>
          <h1 className="boot-title">LANTERNWAVE</h1>
          <p className="boot-subtitle">CLICK TO INITIALIZE</p>
        </div>
      )}

      {/* Boot + Code Entry */}
      {stage !== "intro" && (
        <div className="boot-terminal-frame">
          <div className="boot-terminal-lines">
            {visibleLines.map((line, idx) => (
              <div key={idx} className="boot-line">{line}</div>
            ))}
          </div>

          {stage === "code" && (
            <form className="boot-code-form" onSubmit={handleSubmit}>
              <div className="boot-code-label">ENTER ACCESS CODE</div>
              <input
                className="boot-code-input"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
              <button type="submit" className="boot-code-button">CONFIRM</button>
              {error && <div className="boot-error">{error}</div>}
            </form>
          )}

          {stage === "approved" && (
            <div className="boot-approved">ACCESS APPROVED</div>
          )}
        </div>
      )}

      {/* Privacy modal */}
      {showPrivacy && (
        <div className="boot-privacy-overlay">
          <div className="boot-privacy-modal">

            {/* FIXED centered SVG X button */}
            <button
              type="button"
              className="boot-privacy-close"
              onClick={() => setShowPrivacy(false)}
              aria-label="Close"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{ display: "block", margin: "0 auto" }}
              >
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>

            <div className="boot-privacy-content">
              <PrivacyPolicy />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
