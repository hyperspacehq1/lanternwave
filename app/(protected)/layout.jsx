import { headers } from "next/headers";
import ProtectedClientProviders from "@/components/ProtectedClientProviders";

export const dynamic = "force-dynamic";

/* -------------------------------------------------
   Phone detection (phones only, not tablets)
-------------------------------------------------- */
function isPhoneUserAgent(ua = "") {
  const isMobile =
    /iphone|ipod|android.*mobile|windows phone/i.test(ua);

  const isTablet =
    /ipad|android(?!.*mobile)/i.test(ua);

  return isMobile && !isTablet;
}

function MobileNostromoBlock() {
  return (
    <>
      {/* ✅ Plain <style> is allowed in Server Components */}
      <style>{`
        body {
          margin: 0;
          padding: 0;
          background: #000;
        }

        .lw-nostromo {
          min-height: 100vh;
          font-family: "Courier New", monospace;
          color: rgb(245, 197, 66);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .lw-nostromo .terminal {
          width: 100%;
          max-width: 520px;
          padding: 28px 22px;
          position: relative;
          animation: flicker 2.8s infinite;
        }

        .lw-nostromo .terminal::before {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.04),
            rgba(255,255,255,0.04) 1px,
            transparent 2px,
            transparent 4px
          );
          pointer-events: none;
          mix-blend-mode: overlay;
        }

        .lw-nostromo h1 {
          font-size: 18px;
          letter-spacing: 2px;
          margin-bottom: 14px;
        }

        .lw-nostromo p {
          font-size: 14px;
          line-height: 1.6;
          opacity: 0.9;
        }

        .lw-nostromo .status {
          margin-top: 18px;
          opacity: 0.75;
          animation: blink 1.4s steps(2, start) infinite;
        }

        @keyframes flicker {
          0%   { opacity: 0.95; }
          3%   { opacity: 0.85; }
          6%   { opacity: 0.98; }
          8%   { opacity: 0.9; }
          100% { opacity: 0.95; }
        }

        @keyframes blink {
          0% { opacity: 0.2; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>

      <div className="lw-nostromo">
        <div className="terminal">
          <h1>MU/TH/UR 6000</h1>

          <p>
            INITIALIZING INTERFACE…
            <br />
            SYSTEM CAPABILITY CHECK FAILED
          </p>

          <p style={{ marginTop: 12 }}>
            LanternWave does not support mobile phones due to the
            complexity of the user interface and the volume of
            screens and data.
          </p>

          <p style={{ marginTop: 12 }}>
            Please access this system using a computer,
            laptop, or tablet.
          </p>

          <div className="status">SIGNAL LOST ▌▌▌</div>
        </div>
      </div>
    </>
  );
}

export default function ProtectedLayout({ children }) {
  const ua = headers().get("user-agent") || "";

  // 🚫 Phone-only interception
  if (isPhoneUserAgent(ua)) {
    return <MobileNostromoBlock />;
  }

  // ✅ ORIGINAL behavior — unchanged
  return <ProtectedClientProviders>{children}</ProtectedClientProviders>;
}
