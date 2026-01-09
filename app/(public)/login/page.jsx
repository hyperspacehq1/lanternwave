"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../auth.css";

export default function LoginPage() {
  const router = useRouter();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, password }),
      });

      // 👇 IMPORTANT: read raw text first
      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        console.error("LOGIN FAILED", {
          status: res.status,
          response: data,
        });

        setError(
          data?.error ||
          data?.message ||
          `Login failed (${res.status})`
        );
        setLoading(false);
        return;
      }

      router.push("/gm-dashboard");
    } catch (err) {
      console.error("LOGIN NETWORK ERROR", err);
      setError("Network or server error — see console");
      setLoading(false);
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
          <h1 className="lw-auth-title">Sign In</h1>

          <form onSubmit={handleSubmit} className="lw-auth-form">
            <input
              type="text"
              placeholder="Email or Username"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              className="lw-auth-input"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="lw-auth-input"
            />

            {error && <div className="lw-auth-error">{error}</div>}

            <button
              type="submit"
              className="lw-auth-submit"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="lw-auth-links">
  <a href="/forgot-password" className="lw-auth-link">
    Forgot password?
  </a>

  <span className="lw-auth-link-sep">•</span>

  <a href="/forgot-username" className="lw-auth-link">
    Forgot username?
  </a>
</div>
        </div>
      </div>
    </main>
  );
}
