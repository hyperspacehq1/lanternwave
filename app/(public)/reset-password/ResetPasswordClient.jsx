"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "../auth.css";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!code) {
      setError("Invalid or missing reset code.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Reset failed.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("Server error.");
      setLoading(false);
    }
  }

  return (
    <div className="lw-auth-card">
      <h1 className="lw-auth-title">Set New Password</h1>

      {!code && (
        <div className="lw-auth-error">
          Invalid or expired reset link.
        </div>
      )}

      {success ? (
        <div className="lw-auth-success">
          Password updated. Redirecting to sign in…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="lw-auth-form">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="lw-auth-input"
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="lw-auth-input"
          />

          {error && <div className="lw-auth-error">{error}</div>}

          <button
            type="submit"
            className="lw-auth-submit"
            disabled={loading || !code}
          >
            {loading ? "Updating…" : "Reset Password"}
          </button>
        </form>
      )}

      <div className="lw-auth-links">
        <a href="/" className="lw-auth-link">Back to Sign In</a>
      </div>
    </div>
  );
}

export default function ResetPasswordClient() {
  return (
    <Suspense fallback={
      <div className="lw-auth-card">
        <h1 className="lw-auth-title">Set New Password</h1>
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

