import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
    <html lang="en">
      <body className="lw-nostromo">
        <style>{`
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            background: #000;
          }

          .lw-nostromo {
            font-family: "Courier New", monospace;
            color: rgb(245, 197, 66);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .terminal {
            width: 100%;
            max-width: 520px;
            padding: 28px 22px;
            position: relative;
            animation: flicker 2.8s infinite;
          }

          .terminal::before {
            content: "";
            position: absolute;
            inset: 0;
            background:
              repeating-linear-gradient(
                to bottom,
                rgba(255,255,255,0.04),
                rgba(255,255,255,0.04) 1px,
                transparent 2px,
                transparent 4px
              );
            pointer-events: none;
            mix-blend-mode: overlay;
          }

          h1 {
            font-size: 18px;
            letter-spacing: 2px;
            margin-bottom: 14px;
          }

          p {
            font-size: 14px;
            line-height: 1.6;
            opacity: 0.9;
          }

          .status {
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

          <div className="status">
            SIGNAL LOST ▌▌▌
          </div>
        </div>
      </body>
    </html>
  );
}

export default function ProtectedLayout({ children }) {
  const ua = headers().get("user-agent") || "";

  // 🚫 Phone-only interception
  if (isPhoneUserAgent(ua)) {
    return <MobileNostromoBlock />;
  }

  // ✅ Normal protected app
  return (
    <ProtectedClientProviders>
      {children}
    </ProtectedClientProviders>
  );
}
