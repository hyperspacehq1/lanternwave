"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./auth.css";

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
        body: JSON.stringify({
          email,
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create account");
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
    <div className="lw-auth">
      {/* Brand */}
      <div className="lw-brand">
        <img
          src="/lanternwave-logo.png"
          alt="LanternWave"
          className="lw-brand-logo"
        />
        <div className="lw-brand-text">LANTERNWAVE</div>
      </div>

      {/* Card */}
      <div className="lw-auth-card">
        <h1>Create Account</h1>

        {error && <div className="lw-auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Username</label>
          <input
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label>Password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account…" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
