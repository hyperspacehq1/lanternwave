// src/pages/AccessGate.jsx
import React, { useState, useEffect } from "react";
import PrivacyPolicy from "./PrivacyPolicy.jsx";

export default function AccessGate({ onUnlock }) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTimeout(() => setBootDone(true), 3500);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim() === "10241972") {
      setAccessGranted(true);
      setTimeout(() => onUnlock(), 1200);
    } else {
      setError("ACCESS DENIED");
      setTimeout(() => setError(""), 1500);
    }
  };

  return (
    <div className="access-gate-screen">
      {/* 🔷 PRIVACY BUTTON (top-right) */}
      <div
        className="privacy-button"
        onClick={() => setShowPrivacy(true)}
      >
        PRIVACY
      </div>

      <div className="boot-box">
        {!bootDone && (
          <pre className="boot-sequence">
            BOOTING TERMINAL...
            <br />
            WEYLAND-YUTANI APOLLO INITIATED...
            <br />
            ESTABLISHING INTERNAL NETWORK LINK…
          </pre>
        )}

        {bootDone && !accessGranted && (
          <form className="access-form" onSubmit={handleSubmit}>
            <label>ENTER ACCESS CODE</label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
            <button type="submit">ENTER</button>

            {error && <div className="access-error">{error}</div>}
          </form>
        )}

        {accessGranted && (
          <div className="access-approved">ACCESS APPROVED</div>
        )}
      </div>

      {/* 🔷 PRIVACY POLICY MODAL */}
      {showPrivacy && (
        <div className="privacy-modal-overlay">
          <div className="privacy-modal">
            <div
              className="privacy-close"
              onClick={() => setShowPrivacy(false)}
            >
              ✕
            </div>

            <div className="privacy-content">
              <PrivacyPolicy />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
