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
        body: JSON.stringify({
          emailOrUsername,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push("/gm-dashboard");
    } catch (err) {
      console.error(err);
      setError("Server error");
      setLoading(false);
    }
  }

  return (
    <main className="lw-main">
      <div className="lw-auth">
        <div className="lw-auth-card">
          <img
            src="/lanternwave-logo.png"
            alt="Lanternwave"
            className="lw-logo"
          />

          <h1 className="lw-auth-title">Sign In</h1>

          <form onSubmit={handleSubmit} className="lw-auth-form">
            <input
              type="text"
              placeholder="Email or Username"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              autoComplete="username"
              required
              className="lw-auth-input"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
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
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="lw-auth-links">
            <a href="/forgot-password" className="lw-auth-link">
              Forgot password?
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
