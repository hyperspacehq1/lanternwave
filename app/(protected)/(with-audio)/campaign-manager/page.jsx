"use client";

import { useState } from "react";

export default function CampaignManagerDebugUI() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    world_setting: "",
    campaign_date: "",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          campaign_package: "standard",
        }),
      });

      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }

      setResult({
        status: res.status,
        ok: res.ok,
        body,
      });
    } catch (err) {
      setResult({
        status: "network-error",
        ok: false,
        body: String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: 32,
        background: "#000",
        color: "#e6e6e6",
        minHeight: "100vh",
        fontFamily: "system-ui, monospace",
      }}
    >
      <h1 style={{ color: "#6cc5f0" }}>Campaign Manager – UI Debug</h1>

      {/* -------- FORM -------- */}
      <form onSubmit={submit} style={{ maxWidth: 520 }}>
        <Field
          label="Campaign Name (required)"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
        />

        <Field
          label="Description"
          value={form.description}
          onChange={(v) => setForm({ ...form, description: v })}
        />

        <Field
          label="World Setting"
          value={form.world_setting}
          onChange={(v) => setForm({ ...form, world_setting: v })}
        />

        <Field
          label="Campaign Date"
          type="date"
          value={form.campaign_date}
          onChange={(v) => setForm({ ...form, campaign_date: v })}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 16,
            padding: "10px 16px",
            background: "#6cc5f0",
            color: "#000",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Creating…" : "Create Campaign"}
        </button>
      </form>

      {/* -------- RESULT -------- */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ color: "#6cc5f0" }}>Result</h2>
        <pre
          style={{
            background: "#111",
            padding: 16,
            border: "1px solid #333",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {result ? JSON.stringify(result, null, 2) : "No submission yet"}
        </pre>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          background: "#111",
          color: "#e6e6e6",
          border: "1px solid #333",
        }}
      />
    </div>
  );
}
