"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./login.css";

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

      // Success → GM Dashboard
      router.push("/gm-dashboard");
    } catch (err) {
      console.error(err);
      setError("Server error");
      setLoading(false);
    }
  }

  return (
    <div className="lw-login-root">
      {/* Top-right utility nav */}
      <div className="lw-login-topnav">
        <a href="/support">Support</a>
        <a href="/signup">Create Account</a>
        <a href="/">Sign In</a>
      </div>

      {/* Centered login box */}
      <div className="lw-login-container">
        <img
          src="/lanternwave-logo.png"
          alt="Lanternwave"
          className="lw-login-logo"
        />

        <h1 className="lw-login-title">Sign In</h1>

        <form onSubmit={handleSubmit} className="lw-login-form">
          <input
            type="text"
            placeholder="Email or Username"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <div className="lw-login-error">{error}</div>}

          <button
            type="submit"
            className="lw-login-button"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="lw-login-footer">
          <a href="/forgot-password">Forgot password?</a>
        </div>
      </div>
    </div>
  );
}
