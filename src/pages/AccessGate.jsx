import { useState, useEffect, useRef } from "react";

const BOOT_TEXT = [
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

export default function AccessGate({ onUnlock }) {
  const [stage, setStage] = useState("idle"); // idle → boot → code → fail → unlock
  const [lines, setLines] = useState([]);
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const audioRef = useRef(null);

  const correctCode = import.meta.env.VITE_OPEN_CODE;

  // Handle click-to-start
  function begin() {
    setStage("boot");
  }

  // Boot typing effect
  useEffect(() => {
    if (stage !== "boot") return;

    audioRef.current = new Audio("/type.mp3");
    audioRef.current.loop = true;
    audioRef.current.play();

    let i = 0;
    const tick = () => {
      setLines(prev => [...prev, BOOT_TEXT[i]]);
      i++;
      if (i < BOOT_TEXT.length) {
        setTimeout(tick, 200);
      } else {
        audioRef.current.pause();
        setStage("code");
      }
    };
    tick();
  }, [stage]);

  function submitCode(e) {
    e.preventDefault();
    if (code === correctCode) {
      setStage("unlock");
      setTimeout(() => onUnlock(), 800);
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setCode("");

      if (next >= 3) {
        setLines([]);
        setAttempts(0);
        setStage("idle");
      }
    }
  }

  return (
    <div className="gate-screen">
      {stage === "idle" && (
        <div className="gate-center" onClick={begin}>
          <img src="/logo.png" className="gate-logo" />
          <div className="gate-title">LANTERNWAVE SYSTEM</div>
          <div className="gate-sub">Click to Initialize</div>
        </div>
      )}

      {stage === "boot" && (
        <div className="gate-terminal">
          {lines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}

      {stage === "code" && (
        <form className="gate-code" onSubmit={submitCode}>
          <div>ENTER ACCESS CODE:</div>
          <input
            autoFocus
            type="password"
            value={code}
            onChange={e => setCode(e.target.value)}
            className="gate-input"
          />
        </form>
      )}

      {stage === "unlock" && (
        <div className="gate-approve">ACCESS APPROVED</div>
      )}
    </div>
  );
}
