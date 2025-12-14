"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./login.css"; // reuse same styles

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    tenantName: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
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
    <div className="lw-login-root">
      <div className="lw-login-topnav">
        <a href="/support">Support</a>
        <a href="/">Sign In</a>
      </div>

      <div className="lw-login-container">
        <img
          src="/lanternwave-logo.png"
          alt="Lanternwave"
          className="lw-login-logo"
        />

        <h1 className="lw-login-title">Create Account</h1>

        <form onSubmit={handleSubmit} className="lw-login-form">
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            required
          />

          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            required
          />

          <input
            placeholder="Campaign / Organization Name"
            value={form.tenantName}
            onChange={(e) =>
              setForm({ ...form, tenantName: e.target.value })
            }
            required
          />

          {error && <div className="lw-login-error">{error}</div>}

          <button disabled={loading}>
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
