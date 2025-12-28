"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../auth.css";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to create account");
      }

      // Auto-login handled server-side
      router.push("/gm-dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
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
          <h1 className="lw-auth-title">Create Account</h1>

          <form onSubmit={handleSubmit} className="lw-auth-form">
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="lw-auth-input"
            />

            <input
              type="text"
              placeholder="Username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="lw-auth-input"
            />

            <input
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="lw-auth-input"
            />

            {error && <div className="lw-auth-error">{error}</div>}

            <button
              type="submit"
              className="lw-auth-submit"
              disabled={loading}
            >
              {loading ? "Creating Account…" : "Create Account"}
            </button>
          </form>

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
