"use client";

import { useEffect, useState } from "react";

export default function CampaignManagerDebug() {
  const [data, setData] = useState({
    auth: null,
    campaigns: null,
    createResult: null,
    errors: [],
  });

  useEffect(() => {
    (async () => {
      const result = {
        auth: null,
        campaigns: null,
        createResult: null,
        errors: [],
      };

      // ---------- AUTH / TENANT ----------
      try {
        const r = await fetch("/api/debug");
        result.auth = {
          status: r.status,
          body: await r.json(),
        };
      } catch (e) {
        result.errors.push({ step: "auth", error: String(e) });
      }

      // ---------- LIST CAMPAIGNS ----------
      try {
        const r = await fetch("/api/campaigns");
        result.campaigns = {
          status: r.status,
          body: r.status === 200 ? await r.json() : await r.text(),
        };
      } catch (e) {
        result.errors.push({ step: "list campaigns", error: String(e) });
      }

      // ---------- CREATE CAMPAIGN ----------
      try {
        const r = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "DEBUG CAMPAIGN",
            description: "Created from debug page",
            world_setting: "Debug World",
            campaign_date: "2025-12-18",
            campaign_package: "standard",
          }),
        });

        let body;
        try {
          body = await r.json();
        } catch {
          body = await r.text();
        }

        result.createResult = {
          status: r.status,
          body,
        };
      } catch (e) {
        result.errors.push({ step: "create campaign", error: String(e) });
      }

      setData(result);
    })();
  }, []);

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "monospace",
        color: "#00ff99",
        background: "#000",
        minHeight: "100vh",
      }}
    >
      <h1>Campaign Manager – Ultimate Debug</h1>

      <Section title="1️⃣ Auth / Tenant">
        {json(data.auth)}
      </Section>

      <Section title="2️⃣ GET /api/campaigns">
        {json(data.campaigns)}
      </Section>

      <Section title="3️⃣ POST /api/campaigns (Create)">
        {json(data.createResult)}
      </Section>

      <Section title="4️⃣ Errors">
        {json(data.errors)}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ color: "#6cc5f0" }}>{title}</h2>
      <pre
        style={{
          padding: 16,
          background: "#111",
          border: "1px solid #333",
          overflowX: "auto",
        }}
      >
        {children}
      </pre>
    </div>
  );
}

function json(value) {
  return value == null ? "null" : JSON.stringify(value, null, 2);
}
