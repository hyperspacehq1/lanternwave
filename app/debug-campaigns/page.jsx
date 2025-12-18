"use client";

import { useState } from "react";

export default function DebugCampaignsStandalone() {
  const [result, setResult] = useState(null);

  async function create() {
    setResult("Loading...");

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Standalone Debug Campaign",
          description: "Created outside protected layout",
          world_setting: "Debug",
          campaign_date: "2025-12-18",
          campaign_package: "standard",
        }),
      });

      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      setResult({
        status: res.status,
        ok: res.ok,
        body: parsed,
      });
    } catch (e) {
      setResult(String(e));
    }
  }

  return (
    <div style={{ padding: 40, background: "#000", color: "#0f0" }}>
      <h1>Standalone Campaign POST Debug</h1>
      <button onClick={create}>Create Campaign</button>
      <pre style={{ marginTop: 20 }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
