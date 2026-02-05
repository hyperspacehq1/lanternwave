import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";
import "../auth.css";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
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
          <ResetPasswordClient />
        </Suspense>
      </div>
    </main>
  );
}

