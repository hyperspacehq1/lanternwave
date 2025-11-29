// AccessGate.jsx — FINAL MU/TH/UR TERMINAL VERSION

import React, { useState, useEffect, useRef } from "react";

export default function AccessGate({ onUnlock }) {
  const [bootLines, setBootLines] = useState([]);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");

  const terminalRef = useRef(null);

  // Boot Script (unchanged from original)
  const sequence = [
    "BOOTING MU/TH/UR 182 TERMINAL...",
    "WEYLAND-YUTANI APOLLO INITIATED...",
    "ESTABLISHING INTERNAL NETWORK LINK…",
    "SECURITY PROTOCOL ONLINE...",
    "",
    "READY."
  ];

  // Typewriter — matches your old pacing & scroll behavior
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setBootLines(prev => [...prev, sequence[i]]);
      i++;
      if (i >= sequence.length) {
        clearInterval(interval);
        setTimeout(() => setShowCodeEntry(true), 600);
      }
    }, 700);
  }, []);

  // Scroll terminal as lines are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [bootLines]);

  function handleSubmit() {
    const correct = import.meta.env.VITE_OPEN_CODE || "10241972";

    if (codeInput.trim() === correct.toString()) {
      setApproved(true);
      setError("");

      // small delay, then unlock
      setTimeout(() => {
        if (onUnlock) onUnlock();
      }, 1000);
    } else {
      setError("ACCESS DENIED");
    }
  }

  return (
    <div className="gate-screen">

      <div className="gate-terminal" ref={terminalRef}>
        {bootLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}

        {showCodeEntry && !approved && (
          <div className="gate-code">
            <div>ENTER ACCESS CODE</div>

            <input
              type="password"
              className="gate-input"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />

            {error && (
              <div className="access-error">{error}</div>
            )}
          </div>
        )}

        {approved && (
          <div className="gate-approve">
            ACCESS APPROVED
          </div>
        )}
      </div>
    </div>
  );
}
