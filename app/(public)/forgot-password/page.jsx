import { Suspense } from "react";
import ForgotPasswordClient from "./ForgotPasswordClient";
import "../auth.css";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="lw-main">
      <div className="lw-auth">

        {/* BRAND */}
        <div className="lw-brand">
          <img
            src="/lanternwave-logo.png"
            alt="Lanternwave"
            className="lw-brand-logo"
          />
          <div className="lw-brand-text">LANTERNWAVE</div>
        </div>

        <Suspense
          fallback={
            <div className="lw-auth-card">
              <div className="lw-auth-status">Loading…</div>
            </div>
          }
        >
          <ForgotPasswordClient />
        </Suspense>
      </div>
    </main>
  );
}

