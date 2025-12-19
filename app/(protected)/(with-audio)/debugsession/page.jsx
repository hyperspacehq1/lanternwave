"use client";

import { useEffect, useMemo, useState } from "react";
import DebugSessionForm, {
  makeRandomSession,
} from "@/components/forms/DebugSession";

function nowStamp() {
  return new Date().toISOString();
}

async function readResponseSafely(res) {
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, ok: res.ok, text, json };
}

export default function DebugSessionPage() {
  const [form, setForm] = useState(() => makeRandomSession());
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [campaigns, setCampaigns] = useState([]);

  const addLog = (entry) =>
    setLog((prev) => [{ ts: nowStamp(), ...entry }, ...prev]);

  const buttonsDisabled = useMemo(() => busy, [busy]);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((rows) => setCampaigns(Array.isArray(rows) ? rows : []))
      .catch(() => setCampaigns([]));
  }, []);

  async function createSession() {
    setBusy(true);
    try {
      const payload = {
        campaign_id: form.campaign_id,
        description: form.description,
        geography: form.geography,
        notes: form.notes,
        history: form.history,
      };

      addLog({
        kind: "info",
        step: "create_session",
        request: {
          method: "POST",
          url: "/api/debugsession",
          body: payload,
        },
      });

      const res = await fetch("/api/debugsession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const parsed = await readResponseSafely(res);

      addLog({
        kind: parsed.ok ? "ok" : "error",
        step: "create_session",
        response: parsed,
      });
    } catch (e) {
      addLog({
        kind: "error",
        step: "exception",
        error: String(e),
      });
    } finally {
      setBusy(false);
    }
  }

  function autopopulate() {
    const next = makeRandomSession();
    setForm(next);
    addLog({
      kind: "ok",
      step: "autopopulate",
      payload: next,
    });
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Debug Session Creator</h1>
      <p style={{ opacity: 0.75 }}>
        Direct, isolated session creation with full visibility.
      </p>

      <DebugSessionForm
        value={form}
        campaigns={campaigns}
        onChange={setForm}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button disabled={buttonsDisabled} onClick={autopopulate}>
          Autopopulate
        </button>

        <button disabled={buttonsDisabled} onClick={createSession}>
          Create Session
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>Logs</h2>

        {log.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No logs yet.</div>
        ) : (
          log.map((entry, i) => (
            <pre
              key={i}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: 12,
                borderRadius: 10,
                marginBottom: 12,
                overflow: "auto",
              }}
            >
              {JSON.stringify(entry, null, 2)}
            </pre>
          ))
        )}
      </div>
    </div>
  );
}
