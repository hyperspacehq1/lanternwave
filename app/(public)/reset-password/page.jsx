import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";
import "../auth.css";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="lw-main">
      <div className="lw-auth">
        <Suspense
          fallback={
            <div className="lw-auth-card">
              <div className="lw-auth-status">
                Loading…
              </div>
            </div>
          }
        >
          <ResetPasswordClient />
        </Suspense>
      </div>
    </main>
  );
}
