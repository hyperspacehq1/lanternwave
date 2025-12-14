"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "../auth.css";

export default function ResetPasswordPage() {
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
        body: JSON.stringify({
          code,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Reset failed.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Redirect to login after short pause
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
    <div className="lw-login-root">
      <div className="lw-login-container">
        <img
          src="/lanternwave-logo.png"
          alt="Lanternwave"
          className="lw-login-logo"
        />

        <h1 className="lw-login-title">Set New Password</h1>

        {!code && (
          <div className="lw-login-error">
            Invalid or expired reset link.
          </div>
        )}

        {success ? (
          <div className="lw-login-success">
            Password updated. Redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="lw-login-form">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            {error && <div className="lw-login-error">{error}</div>}

            <button type="submit" disabled={loading || !code}>
              {loading ? "Updating…" : "Reset Password"}
            </button>
          </form>
        )}

        <div className="lw-login-footer">
          <a href="/">Back to Sign In</a>
        </div>
      </div>
    </div>
  );
}
