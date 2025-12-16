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

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push("/gm-dashboard");
    } catch {
      setError("Server error");
      setLoading(false);
    }
  }

  return (
    <main className="lw-main">
      <div className="lw-auth">

        {/* LOGO — OUTSIDE CARD */}
        <div className="lw-auth-logo-wrap">
          <img
            src="/lanternwave-logo.png"
            alt="Lanternwave"
            className="lw-auth-logo"
          />
        </div>

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

        {/* LOCAL STYLES — SAFE & SCOPED */}
        <style jsx>{`
          .lw-auth-logo-wrap {
            margin-bottom: 1.25rem;
            display: flex;
            justify-content: center;
            pointer-events: none;
          }

          .lw-auth-logo {
            width: 160px;
            height: auto;
            filter:
              drop-shadow(0 0 12px rgba(108, 196, 23, 0.45))
              drop-shadow(0 0 28px rgba(108, 196, 23, 0.25));
            animation: logoPulse 3.5s ease-in-out infinite;
          }

          @keyframes logoPulse {
            0% {
              filter:
                drop-shadow(0 0 10px rgba(108, 196, 23, 0.35))
                drop-shadow(0 0 22px rgba(108, 196, 23, 0.2));
            }
            50% {
              filter:
                drop-shadow(0 0 18px rgba(108, 196, 23, 0.65))
                drop-shadow(0 0 42px rgba(108, 196, 23, 0.4));
            }
            100% {
              filter:
                drop-shadow(0 0 10px rgba(108, 196, 23, 0.35))
                drop-shadow(0 0 22px rgba(108, 196, 23, 0.2));
            }
          }
        `}</style>
      </div>
    </main>
  );
}
