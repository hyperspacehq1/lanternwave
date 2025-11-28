import { useState, useEffect } from "react";

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
  "---",
  "",
  "IDENTITY VERIFICATION REQUIRED.",
  "",
  "ENTER ACCESS CODE:"
];

// Flatten into one full string for character-by-character typing
const BOOT_TEXT = BOOT_LINES.join("\n");

export default function AccessGate({ onUnlock }) {
  const [stage, setStage] = useState("idle");    // idle → boot → code → unlock
  const [typedCount, setTypedCount] = useState(0); // number of characters rendered
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);

  const correctCode = import.meta.env.VITE_OPEN_CODE;

  // Start boot on click
  const begin = () => {
    setTypedCount(0);
    setStage("boot");
  };

  // Character-by-character typing effect (NO SOUND)
  useEffect(() => {
    if (stage !== "boot") return;

    let cancelled = false;

    const step = () => {
      setTypedCount(prev => {
        if (prev >= BOOT_TEXT.length) return prev;
        return prev + 1;
      });

      if (!cancelled) {
        setTimeout(() => {
          if (!cancelled) step();
        }, 15); // fast typing (twice as fast)
      }
    };

    step();

    return () => {
      cancelled = true;
    };
  }, [stage]);

  // Move from boot → code entry
  useEffect(() => {
    if (stage === "boot" && typedCount >= BOOT_TEXT.length) {
      setStage("code");
    }
  }, [stage, typedCount]);

  // Rolling 10-line window
  const allLines = BOOT_TEXT.slice(0, typedCount).split("\n");
  const visibleLines = allLines.slice(-10);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!correctCode) {
      // If no OPEN_CODE set, unlock automatically
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
        // reset whole sequence
        setTypedCount(0);
        setAttempts(0);
        setStage("idle");
      }
    }
  };

  return (
    <div className="gate-screen">
      {/* INITIAL CLICK SCREEN */}
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

      {/* BOOT SCROLL */}
      {stage === "boot" && (
        <div className="gate-terminal">
          {visibleLines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}

      {/* PASSWORD ENTRY */}
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

      {/* ACCESS APPROVED */}
      {stage === "unlock" && (
        <div className="gate-center">
          <div className="gate-title">ACCESS APPROVED</div>
        </div>
      )}
    </div>
  );
}
