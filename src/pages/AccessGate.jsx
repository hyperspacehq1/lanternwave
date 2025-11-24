import { useState, useEffect, useRef } from "react";

const BOOT_LINES = [
  "AEGIS/OS v5.2.1 (CLASSIFIED BUILD)",
  "© U.S. GOVT / MAJESTIC-12 LEGACY INTERFACE",
  "",
  "BOOT SEQUENCE INITIATED...",
  "",
  "[ OK ] Power-on self-test ............... PASSED",
  "[ OK ] Secure BIOS checksum ............. VERIFIED",
  "[ OK ] Encrypted volume /ROOT/.......... MOUNTED",
  "[ OK ] Quantum entropy pool ............ ONLINE",
  "[ OK ] SIGINT relay uplink ............. STANDBY",
  "[ OK ] BLACKNET routing tables ......... LOADED",
  "[ OK ] AIR-GAP verification ............ CONFIRMED",
  "",
  "LOADING CORE MODULES...",
  "  -> MOD_AEGIS_CORE                 [LOADED]",
  "  -> MOD_OBELISK_SIGMA              [LOADED]",
  "  -> MOD_GLASS_HARP (PSY-HAZ)       [RESTRICTED]",
  "  -> MOD_TARTARUS_ARCHIVE           [LOADED]",
  "  -> MOD_UNK_███                    [ERROR] FLAGGED / QUARANTINED",
  "",
  "CROSSCHECKING DATA INTEGRITY...",
  "  HASH: TARTARUS_ARCHIVE            [MISMATCH!]",
  "  NOTE: PRIOR REDACTION EVENT DETECTED (UNLOGGED)",
  "  STATUS: PROCEEDING UNDER PROTEST",
  "",
  "INITIALIZING OPERATOR INTERFACE...",
  "  Secure shell                [READY]",
  "  Dead-drop channels          [READY]",
  "  Incident logbook            [READY]",
  "  Evidence locker index       [READY]",
  "  Reality deviation monitor   [NO BASELINE]",
  "",
  "WARNING: MEMETIC CONTAMINATION THRESHOLD AT 11%",
  "WARNING: ONE OR MORE CASEFILES ARE MISSING FROM HISTORY",
  "WARNING: LAST LOGIN ENTRY CORRUPTED / UNREADABLE",
  "",
  "CLASSIFICATION BANNER: ███████████████",
  "COMPARTMENT: DELTA GREEN / EYES ONLY",
  "CLEARANCE LEVEL: KESSLER-9 OR ABOVE REQUIRED",
  "",
  "---",
  "",
  "IDENTITY VERIFICATION REQUIRED.",
  "",
  "ENTER ACCESS CODE:"
];

// Flatten to one string so we can type char-by-char
const BOOT_TEXT = BOOT_LINES.join("\n");

export default function AccessGate({ onUnlock }) {
  const [stage, setStage] = useState("idle"); // idle → boot → code → unlock
  const [typedCount, setTypedCount] = useState(0); // chars typed into BOOT_TEXT
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);

  const audioRef = useRef(null);
  const correctCode = import.meta.env.VITE_OPEN_CODE;

  // Start boot on click
  const begin = () => {
    setTypedCount(0);
    setStage("boot");
  };

  // Character-by-character typing effect
  useEffect(() => {
    if (stage !== "boot") return;

    // start / loop typing sound
    if (!audioRef.current) {
      audioRef.current = new Audio("/type.mp3");
      audioRef.current.loop = true;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});

    let cancelled = false;

    const step = () => {
      setTypedCount(prev => {
        if (prev >= BOOT_TEXT.length) {
          return prev;
        }
        return prev + 1;
      });

      if (!cancelled) {
        setTimeout(() => {
          if (!cancelled) step();
        }, 60); // speed A: ~60ms per char
      }
    };

    step();

    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [stage]);

  // When finished typing, move to code stage & stop sound
  useEffect(() => {
    if (stage === "boot" && typedCount >= BOOT_TEXT.length) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setStage("code");
    }
  }, [stage, typedCount]);

  // Compute visible lines (rolling window of last 10)
  const allLines = BOOT_TEXT.slice(0, typedCount).split("\n");
  const visibleLines = allLines.slice(-10); // only last 10 lines

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!correctCode) {
      // If no code is configured, just unlock
      onUnlock();
      return;
    }

    if (code === correctCode) {
      setStage("unlock");
      setTimeout(onUnlock, 800);
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setCode("");
      if (next >= 3) {
        // Reset back to idle after 3 failed attempts
        setTypedCount(0);
        setAttempts(0);
        setStage("idle");
      }
    }
  };

  return (
    <div className="gate-screen">
      {stage === "idle" && (
        <div className="gate-center" onClick={begin}>
          <img
            src="/lanterwave-logo.png"
            className="gate-logo"
            alt="Lanternwave Logo"
          />
          <div className="gate-title">LANTERNWAVE SYSTEM</div>
          <div className="gate-sub">CLICK TO INITIALIZE</div>
        </div>
      )}

      {stage === "boot" && (
        <div className="gate-terminal">
          {visibleLines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}

      {stage === "code" && (
        <div className="gate-terminal">
          {visibleLines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
          <form className="gate-code" onSubmit={handleSubmit}>
            <div>ENTER ACCESS CODE:</div>
            <input
              autoFocus
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="gate-input"
            />
          </form>
        </div>
      )}

      {stage === "unlock" && (
        <div className="gate-center">
          <div className="gate-title">ACCESS APPROVED</div>
        </div>
      )}
    </div>
  );
}
