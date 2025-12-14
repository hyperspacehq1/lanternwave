"use client";

import { useState } from "react";
import "./login.css";

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
    } catch (err) {
      console.error(err);
      setError("Server error");
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

        <h1 className="lw-login-title">Reset Password</h1>

        {sent ? (
          <div className="lw-login-success">
            If an account exists for that email, a reset link has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="lw-login-form">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && <div className="lw-login-error">{error}</div>}

            <button type="submit">Send Reset Link</button>
          </form>
        )}

        <div className="lw-login-footer">
          <a href="/">Back to Sign In</a>
        </div>
      </div>
    </div>
  );
}
