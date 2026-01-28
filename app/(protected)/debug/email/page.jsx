"use client";

import { useState } from "react";

export default function EmailDebugPage() {
  const [email, setEmail] = useState("");
  const [template, setTemplate] = useState("welcome");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function sendTest() {
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/debug/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, template }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Email Debug</h1>

      <input
        type="email"
        placeholder="test@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: 12, width: 320 }}
      />

      <select
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        style={{ display: "block", marginBottom: 12 }}
      >
        <option value="welcome">Welcome</option>
        <option value="password-reset">Password Reset</option>
        <option value="forgot-username">Forgot Username</option>
      </select>

      <button onClick={sendTest} disabled={loading}>
        {loading ? "Sending…" : "Send Test Email"}
      </button>

      {result && (
        <pre style={{ marginTop: 24 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
