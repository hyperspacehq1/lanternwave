import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="lw-login-root" />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
