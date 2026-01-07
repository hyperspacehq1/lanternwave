"use client";

import { useState } from "react";
import "../auth.css"; // adjust if your public auth css lives elsewhere

export default function ForgotUsernamePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      console.log("FORGOT USERNAME RESPONSE", {
        status: res.status,
        data,
      });

      // Always show success (no enumeration)
      setSubmitted(true);
    } catch (err) {
      console.error("FORGOT USERNAME NETWORK ERROR", err);
      setError("Network error — see console");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="lw-main">
      <div className="lw-auth">
        <div className="lw-brand">
          <img
            src="/lanternwave-logo.png"
            alt="Lanternwave"
            className="lw-brand-logo"
          />
          <div className="lw-brand-text">LANTERNWAVE</div>
        </div>

        <div className="lw-auth-card">
          <h1 className="lw-auth-title">Forgot Username</h1>

          {submitted ? (
            <div className="lw-auth-success">
              If an account exists for <strong>{email}</strong>, we’ve
              sent your username to that address.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="lw-auth-form">
              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="lw-auth-input"
              />

              {error && (
                <div className="lw-auth-error">{error}</div>
              )}

              <button
                type="submit"
                className="lw-auth-submit"
                disabled={loading}
              >
                {loading ? "Sending…" : "Email My Username"}
              </button>
            </form>
          )}

          <div className="lw-auth-links">
            <a href="/login" className="lw-auth-link">
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
