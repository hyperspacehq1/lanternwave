"use client";

import React, { useEffect, useState } from "react";
import PrivacyPolicy from "./PrivacyPolicy.jsx";
import "./access-gate.css";

// ===========================================================
// SETTINGS
// ===========================================================
const ACCESS_CODE = "10241972"; 
const TYPE_SPEED = 15;
const MAX_VISIBLE_LINES = 10;

// ===========================================================
// BOOT SEQUENCE TEXT
// ===========================================================
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

export default function AccessGatePage() {
  // ===========================================================
  // STATE
  // ===========================================================
  const [stage, setStage] = useState("intro");
  const [bootLines, setBootLines] = useState([]);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // ===========================================================
  // PERSISTENT ACCESS CHECK (24 hours)
  // ===========================================================
  useEffect(() => {
    const lastAccess = localStorage.getItem("lw_access_granted");
    const ts = lastAccess ? Number(lastAccess) : 0;

    const DAY = 24 * 60 * 60 * 1000;

    if (Date.now() - ts < DAY) {
      // Already authorized → skip boot + code entry
      setStage("approved");
    }
  }, []);

  // ===========================================================
  // BOOT SEQUENCE
  // ===========================================================
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

      if (!currentLines[lineIndex]) currentLines[lineIndex] = "";
      currentLines[lineIndex] += fullLine.charAt(charIndex);

      if (charIndex >= fullLine.length) {
        lineIndex++;
        charIndex = 0;
      } else {
        charIndex++;
      }

      setBootLines([...currentLines]);
    }, TYPE_SPEED);

    return () => clearInterval(interval);
  }, [stage]);

  // ===========================================================
  // APPROVED → REDIRECT
  // ===========================================================
  useEffect(() => {
    if (stage !== "approved") return;

    // Save timestamp so next visit skips login
    localStorage.setItem("lw_access_granted", Date.now().toString());

    const t = setTimeout(() => {
      window.location.href = "/controller";
    }, 1200);

    return () => clearTimeout(t);
  }, [stage]);

  const visibleLines = bootLines.slice(-MAX_VISIBLE_LINES);

  // ===========================================================
  // HANDLERS
  // ===========================================================
  const initialize = () => {
    if (stage === "intro") setStage("boot");
  };

  const submitCode = (e) => {
    e.preventDefault();
    if (code.trim() === ACCESS_CODE) {
      setError("");
      setStage("approved");
    } else {
      setError("ACCESS DENIED");
      setTimeout(() => setError(""), 1500);
    }
  };

  // ===========================================================
  // UI
  // ===========================================================
  return (
    <div className={`boot-screen ${stage === "approved" ? "boot-screen-fade" : ""}`}>

      {/* PRIVACY BUTTON */}
      <button
        type="button"
        className="boot-privacy-button"
        onClick={() => setShowPrivacy(true)}
      >
        PRIVACY POLICY
      </button>

      {/* INTRO */}
      {stage === "intro" && (
        <div className="boot-intro" onClick={initialize}>
          <div className="boot-logo-wrap">
            <img src="/lanternwave-logo.png" className="boot-logo" />
          </div>
          <h1 className="boot-title">LANTERNWAVE</h1>
          <p className="boot-subtitle">CLICK TO INITIALIZE</p>
        </div>
      )}

      {/* TERMINAL */}
      {stage !== "intro" && (
        <div className="boot-terminal-frame">
          <div className="boot-terminal-lines">
            {visibleLines.map((line, i) => (
              <div key={i} className="boot-line">
                {line}
              </div>
            ))}
          </div>

          {/* CODE ENTRY */}
          {stage === "code" && (
            <form className="boot-code-form" onSubmit={submitCode}>
              <div className="boot-code-label">ENTER ACCESS CODE</div>

              <input
                className="boot-code-input"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />

              <button type="submit" className="boot-code-button">
                CONFIRM
              </button>

              {error && <div className="boot-error">{error}</div>}
            </form>
          )}

          {stage === "approved" && (
            <div className="boot-approved">ACCESS APPROVED</div>
          )}
        </div>
      )}

      {/* PRIVACY MODAL */}
      {showPrivacy && (
        <div className="boot-privacy-overlay">
          <div className="boot-privacy-modal">
            <button
              className="boot-privacy-close"
              onClick={() => setShowPrivacy(false)}
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
