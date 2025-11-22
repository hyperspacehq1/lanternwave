// src/pages/BootGate.jsx
import React, { useState, useEffect, useRef } from "react";
import typeSound from "../assets/type.mp3";

export default function BootGate({ children }) {
  const [stage, setStage] = useState("init");
  // stages: init → boot → code → player

  const [bootText, setBootText] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [codeInput, setCodeInput] = useState("");
  const audioRef = useRef(null);

  const fullBootMsg = [
    "BOOTING MU/TH/UR 182 TERMINAL...",
    "WEYLAND-YUTANI APOLLO LINK ESTABLISHED...",
    "INITIALIZING LANTERNWAVE NODE...",
    "LOADING CORE SYSTEMS...",
    "ROUTING AUDIO-VISUAL CHANNELS...",
    "PREPARING HOST CONSOLE INTERFACE...",
  ];

  // Fade transition
  const [fade, setFade] = useState(false);

  // ---- Start boot sequence typing ----
  useEffect(() => {
    if (stage !== "boot") return;

    let index = 0;
    let lineIndex = 0;

    setBootText("");
    audioRef.current.volume = 0.4;
    audioRef.current.play().catch(() => {});

    const typeInterval = setInterval(() => {
      const currentLine = fullBootMsg[lineIndex];
      setBootText((old) => old + currentLine[index]);

      index++;

      if (index === currentLine.length) {
        setBootText((old) => old + "\n");
        index = 0;
        lineIndex++;

        if (lineIndex === fullBootMsg.length) {
          clearInterval(typeInterval);
          setTimeout(() => {
            setFade(true);
            setTimeout(() => {
              setFade(false);
              setStage("code");
            }, 300);
          }, 600);
        }
      }
    }, 40);

    return () => clearInterval(typeInterval);
  }, [stage]);

  // ---- Access Code ----
  function handleSubmit() {
    if (codeInput === "91011") {
      setFade(true);
      setTimeout(() => {
        setStage("player");
      }, 350);
      return;
    }

    setAttempts((a) => a + 1);

    if (attempts + 1 >= 3) {
      // full reset
      setFade(true);
      setTimeout(() => {
        setStage("init");
        setBootText("");
        setCodeInput("");
        setAttempts(0);
        setFade(false);
      }, 350);
      return;
    }

    // wrong
    setCodeInput("INVALID CODE");
    setTimeout(() => setCodeInput(""), 900);
  }

  // ---- Stage Rendering ----
  if (stage === "player") {
    return (
      <div className={`boot-fade-in`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`boot-container ${fade ? "boot-fade-out" : ""}`}>
      <audio ref={audioRef} src={typeSound} preload="auto" />

      {/* ---- INITIAL SCREEN ---- */}
      {stage === "init" && (
        <div
          className="boot-init-screen"
          onClick={() => {
            setFade(true);
            setTimeout(() => {
              setFade(false);
              setStage("boot");
            }, 300);
          }}
        >
          CLICK TO INITIALIZE
        </div>
      )}

      {/* ---- BOOT SEQUENCE ---- */}
      {stage === "boot" && (
        <pre className="boot-sequence">
          {bootText}
          <span className="boot-cursor">█</span>
        </pre>
      )}

      {/* ---- ACCESS CODE ---- */}
      {stage === "code" && (
        <div className="boot-code-screen">
          <div className="boot-code-title">ENTER ACCESS CODE</div>

          <input
            className="boot-code-input"
            type="password"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />

          <button className="boot-code-button" onClick={handleSubmit}>
            SUBMIT
          </button>

          <div className="boot-attempts">
            Attempts Remaining: {3 - attempts}
          </div>
        </div>
      )}
    </div>
  );
}
