"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken"

  /* --------------------------------
     Username availability check
     -------------------------------- */
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus(null);
      return;
    }

    setUsernameStatus("checking");

    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(username)}`
        );
        const data = await res.json();

        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus(null);
      }
    }, 400); // debounce

    return () => clearTimeout(handle);
  }, [username]);

  /* --------------------------------
     Submit handler
     -------------------------------- */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (usernameStatus === "taken") {
      setError("That username is already taken.");
      return;
    }

    setLoading(true);

    const form = new FormData(e.currentTarget);

    const payload = {
      email: form.get("email"),
      username: form.get("username"),
      password: form.get("password"),
    };

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Signup failed");
      }

      // ✅ Success → go to GM Dashboard
      router.push("/gm-dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h1>Create Account</h1>

      <form onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
        />

        <input
          name="username"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        {/* Username feedback */}
        {usernameStatus === "checking" && (
          <div className="hint">Checking username…</div>
        )}
        {usernameStatus === "available" && (
          <div className="success">Username is available</div>
        )}
        {usernameStatus === "taken" && (
          <div className="error">Username already taken</div>
        )}

        <input
          name="password"
          type="password"
          placeholder="Password"
          required
        />

        {error && <div className="error">{error}</div>}

        <button
          type="submit"
          disabled={loading || usernameStatus === "taken"}
        >
          {loading ? "Creating…" : "Create Account"}
        </button>
      </form>
    </div>
  );
}
