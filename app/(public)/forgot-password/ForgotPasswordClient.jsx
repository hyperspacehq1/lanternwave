"use client";

import { useState } from "react";
import "../auth.css";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Request failed.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Server error.");
      setLoading(false);
    }
  }

  return (
    <div className="lw-auth-card">
      <h1 className="lw-auth-title">Reset Password</h1>

      {success ? (
        <div className="lw-auth-success">
          If an account exists with that email, we've sent password reset instructions.
        </div>
      ) : (
        <>
          <p className="lw-auth-description">
            Enter your email address and we'll send you a link to reset your password.
          </p>

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

            <button
              type="submit"
              className="lw-auth-submit"
              disabled={loading}
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        </>
      )}

      <div className="lw-auth-links">
        <a href="/" className="lw-auth-link">Back to Sign In</a>
      </div>
    </div>
  );
}