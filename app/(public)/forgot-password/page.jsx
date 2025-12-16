"use client";

import { useState } from "react";
import "../auth.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setSent(true);
    } catch {
      setError("Server error");
    }
  }

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

        {/* CARD */}
        <div className="lw-auth-card">
          <h1 className="lw-auth-title">Reset Password</h1>

          {sent ? (
            <div className="lw-auth-status">
              If an account exists for that email, a reset link has been sent.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="lw-auth-form">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="lw-auth-input"
              />

              {error && <div className="lw-auth-error">{error}</div>}

              <button type="submit" className="lw-auth-submit">
                Send Reset Link
              </button>
            </form>
          )}

          <div className="lw-auth-links">
            <a href="/" className="lw-auth-link">
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
