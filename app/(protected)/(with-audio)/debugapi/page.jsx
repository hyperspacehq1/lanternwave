"use client";

import { useMemo, useState } from "react";
import DebugForm, { makeRandomCampaign } from "@/components/forms/Debug";

function nowStamp() {
  return new Date().toISOString();
}

async function readResponseSafely(res) {
  // IMPORTANT: read body ONCE, then parse.
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, ok: res.ok, text, json };
}

export default function DebugApiPage() {
  const [form, setForm] = useState(() => makeRandomCampaign());
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);

  const addLog = (entry) =>
    setLog((prev) => [{ ts: nowStamp(), ...entry }, ...prev]);

  const clearLog = () => setLog([]);

  const buttonsDisabled = useMemo(() => busy, [busy]);

  async function runAuthProbe() {
    setBusy(true);
    try {
      addLog({ kind: "info", step: "auth", message: "GET /api/debug" });

      const res = await fetch("/api/debug", { method: "GET" });
      const parsed = await readResponseSafely(res);

      addLog({
        kind: parsed.ok ? "ok" : "error",
        step: "auth",
        request: { method: "GET", url: "/api/debug" },
        response: parsed,
      });
    } catch (e) {
      addLog({ kind: "error", step: "auth", error: String(e) });
    } finally {
      setBusy(false);
    }
  }

  function autopopulate() {
    const next = makeRandomCampaign();
    setForm(next);
    addLog({
      kind: "ok",
      step: "autopopulate",
      message: "Generated random campaign payload for form",
      payload: next,
    });
  }

  async function postActual() {
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        world_setting: form.world_setting || null,
        campaign_date: form.campaign_date || null,
        campaign_package: form.campaign_package || "standard",
      };

      addLog({
        kind: "info",
        step: "create_actual",
        message: "POST /api/campaigns",
        request: { method: "POST", url: "/api/campaigns", body: payload },
      });

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const parsed = await readResponseSafely(res);

      addLog({
        kind: parsed.ok ? "ok" : "error",
        step: "create_actual",
        response: parsed,
      });
    } catch (e) {
      addLog({ kind: "error", step: "create_actual", error: String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function postDebug() {
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        world_setting: form.world_setting || null,
        campaign_date: form.campaign_date || null,
        campaign_package: form.campaign_package || "standard",
      };

      addLog({
        kind: "info",
        step: "create_debug",
        message: "POST /api/debug-campaigns",
        request: { method: "POST", url: "/api/debug-campaigns", body: payload },
      });

      const res = await fetch("/api/debug-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const parsed = await readResponseSafely(res);

      addLog({
        kind: parsed.ok ? "ok" : "error",
        step: "create_debug",
        response: parsed,
      });
    } catch (e) {
      addLog({ kind: "error", step: "create_debug", error: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Campaign Manager – Ultimate Debug</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Goal: reliably write data to Postgres via API routes, with full visible
        request/response logging.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <DebugForm value={form} onChange={setForm} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button disabled={buttonsDisabled} onClick={autopopulate}>
              1) Autopopulate Form
            </button>

            <button disabled={buttonsDisabled} onClick={postActual}>
              2) Create Campaign in Actual Table
            </button>

            <button disabled={buttonsDisabled} onClick={postDebug}>
              3) Create Campaign in Debug Table
            </button>

            <button disabled={buttonsDisabled} onClick={runAuthProbe}>
              Auth / Tenant Probe
            </button>

            <button disabled={buttonsDisabled} onClick={clearLog}>
              Clear Log
            </button>
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Output / Requests / Responses</h2>

          {log.length === 0 ? (
            <div style={{ opacity: 0.75 }}>
              No logs yet. Click “Auth / Tenant Probe” or one of the Create
              buttons.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {log.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    overflow: "auto",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <strong>{entry.step}</strong>
                    <span style={{ opacity: 0.8 }}>{entry.ts}</span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 12,
                        border: "1px solid rgba(255,255,255,0.18)",
                        opacity: 0.9,
                      }}
                    >
                      {entry.kind}
                    </span>
                  </div>

                  {entry.message && (
                    <div style={{ marginTop: 8, opacity: 0.9 }}>
                      {entry.message}
                    </div>
                  )}

                  {entry.request && (
                    <>
                      <div style={{ marginTop: 10, opacity: 0.8 }}>
                        Request:
                      </div>
                      <pre style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(entry.request, null, 2)}
                      </pre>
                    </>
                  )}

                  {entry.payload && (
                    <>
                      <div style={{ marginTop: 10, opacity: 0.8 }}>
                        Payload:
                      </div>
                      <pre style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(entry.payload, null, 2)}
                      </pre>
                    </>
                  )}

                  {entry.response && (
                    <>
                      <div style={{ marginTop: 10, opacity: 0.8 }}>
                        Response:
                      </div>
                      <pre style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(entry.response, null, 2)}
                      </pre>
                    </>
                  )}

                  {entry.error && (
                    <>
                      <div style={{ marginTop: 10, opacity: 0.8 }}>Error:</div>
                      <pre style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                        {entry.error}
                      </pre>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
