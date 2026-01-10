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
  );
}

export default function ProtectedLayout({ children }) {
  const ua = headers().get("user-agent") || "";

  // 🚫 Phone-only interception
  if (isPhoneUserAgent(ua)) {
    return <MobileNostromoBlock />;
  }

  // ✅ ORIGINAL behavior (unchanged)
  return <ProtectedClientProviders>{children}</ProtectedClientProviders>;
}
