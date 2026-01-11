"use client";

import { useMemo, useRef, useState } from "react";

/**
 * Enterprise-grade, transparent ingestion UI.
 *
 * Works even if the server returns partial/non-JSON responses:
 * - Always reads raw text first
 * - Then attempts JSON parse
 * - Shows raw payload on parse failure
 *
 * Expected server response shape (ideal):
 * {
 *   ok: true,
 *   campaignId?: string,
 *   events: [{ stage, message, meta?, ts? }]
 * }
 *
 * But will still render useful diagnostics if response is not in that shape.
 */

// You can extend/rename these to match your server "stage" names over time.
// UI will also show any *extra* stages it sees in event log.
const DEFAULT_STAGE_ORDER = [
  "start",
  "upload_received",
  "validated",
  "text_extracted",
  "schema_extract_start",
  "schema_extract_done",
  "db_insert_start",
  "db_insert_row",
  "db_insert_done",
  "root_campaign_captured",
  "resolve_relationships_start",
  "resolve_relationships_done",
  "completed",
  "error",
];

// prettify stage label
function humanStage(stage) {
  return String(stage || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function nowIso() {
  return new Date().toISOString();
}

function ms(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  if (n < 1000) return `${n}ms`;
  return `${(n / 1000).toFixed(2)}s`;
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function makeRequestId() {
  // stable enough for correlation; not crypto needs
  return `ing_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function ModuleIntegratorClient() {
  const [file, setFile] = useState(null);

  // server-provided events (if any)
  const [events, setEvents] = useState([]);

  // local timeline events (client-side observability)
  const [localLog, setLocalLog] = useState([]);

  // response artifacts
  const [rawResponse, setRawResponse] = useState("");
  const [parsedResponse, setParsedResponse] = useState(null);

  // high-level status
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // correlation
  const [requestId, setRequestId] = useState("");
  const startedAtRef = useRef(null);

  function pushLocal(stage, message, meta) {
    setLocalLog((prev) => [
      ...prev,
      {
        ts: nowIso(),
        stage,
        message,
        meta: meta || null,
      },
    ]);
  }

  const combinedEvents = useMemo(() => {
    // Normalize server events to include ts if missing; do not mutate original.
    const normalizedServer = (events || []).map((e, idx) => ({
      ts: e?.ts || null,
      stage: e?.stage || `unknown_${idx}`,
      message: e?.message || "",
      meta: e?.meta ?? null,
      _source: "server",
    }));

    const normalizedLocal = (localLog || []).map((e, idx) => ({
      ts: e?.ts || null,
      stage: e?.stage || `local_unknown_${idx}`,
      message: e?.message || "",
      meta: e?.meta ?? null,
      _source: "client",
    }));

    // Keep local first (captures fetch/parse failures), then server.
    return [...normalizedLocal, ...normalizedServer];
  }, [events, localLog]);

  const stageOrder = useMemo(() => {
    const seen = new Set(DEFAULT_STAGE_ORDER);
    // Add any stages observed that aren't in the default order
    for (const e of combinedEvents) {
      if (e?.stage && !seen.has(e.stage)) {
        seen.add(e.stage);
      }
    }
    return Array.from(seen);
  }, [combinedEvents]);

  const stageStatus = useMemo(() => {
    // Determine statuses from observed events
    // Heuristic:
    // - "error" stage => fail
    // - "completed" stage => success end
    // - otherwise: any stage seen => success, last seen => running (if loading)
    const byStage = new Map();
    for (const s of stageOrder) byStage.set(s, { status: "pending", lastEvent: null });

    for (const e of combinedEvents) {
      if (!e?.stage) continue;
      byStage.set(e.stage, {
        status: "success",
        lastEvent: e,
      });
    }

    // If we saw error stage, mark it failed
    const errEv = combinedEvents.find((e) => e.stage === "error");
    if (errEv) {
      byStage.set("error", { status: "fail", lastEvent: errEv });
    }

    // Mark current stage as running (best-effort)
    if (loading) {
      // prefer last server stage, else last local stage
      const last = combinedEvents[combinedEvents.length - 1];
      if (last?.stage && byStage.has(last.stage)) {
        const cur = byStage.get(last.stage);
        byStage.set(last.stage, { ...cur, status: "running" });
      } else {
        // If no events yet, mark "start" running
        const cur = byStage.get("start");
        if (cur) byStage.set("start", { ...cur, status: "running" });
      }
    }

    // If completed stage exists, mark it success (not running)
    const compEv = combinedEvents.find((e) => e.stage === "completed");
    if (compEv) {
      byStage.set("completed", { status: "success", lastEvent: compEv });
    }

    return byStage;
  }, [combinedEvents, loading, stageOrder]);

  const summary = useMemo(() => {
    const last = combinedEvents[combinedEvents.length - 1] || null;
    const errEv = combinedEvents.find((e) => e.stage === "error") || null;
    const completedEv = combinedEvents.find((e) => e.stage === "completed") || null;

    // best-effort duration
    const startedAt = startedAtRef.current ? new Date(startedAtRef.current).getTime() : null;
    const durMs = startedAt ? Date.now() - startedAt : null;

    // Find last successful stage before error
    let lastOkStage = null;
    if (errEv) {
      for (let i = combinedEvents.length - 1; i >= 0; i--) {
        const e = combinedEvents[i];
        if (e.stage === "error") continue;
        // consider "client:*" steps too
        lastOkStage = e.stage;
        break;
      }
    }

    return {
      lastStage: last?.stage || "",
      lastMessage: last?.message || "",
      hasError: !!errEv,
      errorMessage: errEv?.message || "",
      errorMeta: errEv?.meta || null,
      completed: !!completedEv,
      durationMs: durMs,
      lastOkStage,
    };
  }, [combinedEvents]);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setEvents([]);
    setLocalLog([]);
    setRawResponse("");
    setParsedResponse(null);

    if (!file) {
      setError("Please select a PDF to upload.");
      return;
    }

    const rid = makeRequestId();
    setRequestId(rid);
    startedAtRef.current = new Date().toISOString();

    setLoading(true);

    pushLocal("client_prepare", "Preparing upload", {
      requestId: rid,
      fileName: file?.name || null,
      fileType: file?.type || null,
      fileSize: file?.size || null,
    });

    const formData = new FormData();
    formData.append("file", file);
    // Correlation ID (server can log it / echo it later)
    formData.append("requestId", rid);

    try {
      pushLocal("client_request_sent", "Sending request to /api/admin/module-integrator", {
        requestId: rid,
        url: "/api/admin/module-integrator",
      });

      const res = await fetch("/api/admin/module-integrator", {
        method: "POST",
        body: formData,
        headers: {
          // Do NOT set content-type for FormData; browser sets boundary
          "x-request-id": rid,
        },
      });

      pushLocal("client_response_received", "Response received", {
        requestId: rid,
        status: res.status,
        ok: res.ok,
        contentType: res.headers.get("content-type"),
      });

      // Always read raw first to avoid losing data on JSON parse errors
      const text = await res.text();
      setRawResponse(text);

      pushLocal("client_response_read", "Response body read", {
        requestId: rid,
        bodyStartsWith: (text || "").slice(0, 40),
        bodyLength: (text || "").length,
      });

      const parsed = safeJsonParse(text);
      if (!parsed.ok) {
        // This is the exact class of bug you’re seeing: non-JSON response.
        pushLocal("client_json_parse_failed", "Failed to parse JSON response", {
          requestId: rid,
          parseError: String(parsed.error?.message || parsed.error),
        });

        throw new Error(
          "Server returned non-JSON response. See RAW RESPONSE panel for the exact payload."
        );
      }

      setParsedResponse(parsed.value);

      if (!res.ok) {
        // route should send JSON: { error: "...", ... }
        const msg = parsed.value?.error || "Ingestion failed";
        pushLocal("client_server_error", "Server returned an error", {
          requestId: rid,
          error: msg,
          payload: parsed.value,
        });
        throw new Error(msg);
      }

      // Accept server events
      const serverEvents = parsed.value?.events || [];
      setEvents(Array.isArray(serverEvents) ? serverEvents : []);

      pushLocal("client_success", "Ingestion response parsed", {
        requestId: rid,
        campaignId: parsed.value?.campaignId || null,
        success: parsed.value?.success ?? parsed.value?.ok ?? true,
      });
    } catch (err) {
      setError(err?.message || "Unexpected error");
      pushLocal("client_failed", "Client caught error", {
        requestId: rid,
        error: String(err?.message || err),
      });
    } finally {
      setLoading(false);
      pushLocal("client_done", "Client finished request lifecycle", {
        requestId: rid,
        durationMs: startedAtRef.current
          ? Date.now() - new Date(startedAtRef.current).getTime()
          : null,
      });
    }
  }

  function copyToClipboard(text) {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="module-integrator">
      <div className="mi-header">
        <div>
          <h1 className="mi-title">Module Integrator</h1>
          <div className="mi-subtitle">Admin · PDF → AI → Postgres · Fully Transparent</div>
        </div>

        <div className="mi-meta">
          <div className="mi-meta-row">
            <span className="mi-meta-label">Request ID</span>
            <span className="mi-meta-value mono">
              {requestId || "—"}
              {requestId && (
                <button
                  type="button"
                  className="mi-mini-btn"
                  onClick={() => copyToClipboard(requestId)}
                >
                  Copy
                </button>
              )}
            </span>
          </div>

          <div className="mi-meta-row">
            <span className="mi-meta-label">Status</span>
            <span className={`mi-badge ${summary.hasError ? "bad" : summary.completed ? "good" : loading ? "warn" : ""}`}>
              {summary.hasError ? "FAILED" : summary.completed ? "COMPLETED" : loading ? "RUNNING" : "IDLE"}
            </span>
          </div>

          <div className="mi-meta-row">
            <span className="mi-meta-label">Duration</span>
            <span className="mi-meta-value mono">{ms(summary.durationMs)}</span>
          </div>
        </div>
      </div>

      <form className="module-upload" onSubmit={handleSubmit}>
        <div className="mi-upload-row">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Processing…" : "Upload PDF"}
          </button>

          <button
            type="button"
            className="secondary"
            disabled={loading && combinedEvents.length === 0}
            onClick={() => {
              // clear state (does not cancel server)
              setError("");
              setEvents([]);
              setLocalLog([]);
              setRawResponse("");
              setParsedResponse(null);
              setRequestId("");
              startedAtRef.current = null;
            }}
          >
            Reset
          </button>

          <button
            type="button"
            className="secondary"
            disabled={combinedEvents.length === 0}
            onClick={() => downloadJson(`module-integrator-${requestId || "log"}.json`, {
              requestId,
              file: file ? { name: file.name, size: file.size, type: file.type } : null,
              summary,
              parsedResponse,
              rawResponse,
              events: combinedEvents,
            })}
          >
            Download Logs
          </button>
        </div>

        {file && (
          <div className="mi-file">
            <span className="mi-file-name">{file.name}</span>
            <span className="mi-file-meta mono">
              {(file.size / 1024).toFixed(1)} KB · {file.type || "application/pdf"}
            </span>
          </div>
        )}
      </form>

      {error && (
        <div className="pipeline-error">
          <div className="pipeline-error-title">Error</div>
          <div className="pipeline-error-body">{error}</div>

          {summary.hasError && (
            <div className="pipeline-error-hints">
              <div>
                <b>Last OK stage:</b> <span className="mono">{summary.lastOkStage || "—"}</span>
              </div>
              <div>
                <b>Failing stage:</b> <span className="mono">error</span>
              </div>
              {summary.errorMessage && (
                <div>
                  <b>Server message:</b> <span className="mono">{summary.errorMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mi-grid">
        {/* Timeline */}
        <section className="mi-card">
          <div className="mi-card-header">
            <h3>Pipeline Timeline</h3>
            <div className="mi-card-actions">
              <button
                type="button"
                className="mi-mini-btn"
                disabled={combinedEvents.length === 0}
                onClick={() => copyToClipboard(JSON.stringify(combinedEvents, null, 2))}
              >
                Copy Events
              </button>
            </div>
          </div>

          <ul className="pipeline-steps">
            {stageOrder.map((stage) => {
              const info = stageStatus.get(stage);
              const st = info?.status || "pending";
              const ev = info?.lastEvent || null;

              return (
                <li key={stage} className={`pipeline-step ${st}`}>
                  <div className="pipeline-step-main">
                    <div className="pipeline-step-title">
                      <span className={`dot ${st}`} />
                      {humanStage(stage)}
                      {ev?._source && (
                        <span className={`source ${ev._source}`}>
                          {ev._source === "server" ? "server" : "client"}
                        </span>
                      )}
                    </div>
                    {ev?.message ? <div className="pipeline-step-message">{ev.message}</div> : null}
                  </div>

                  {ev?.meta ? (
                    <details className="pipeline-step-meta">
                      <summary>Meta</summary>
                      <pre className="mono pre">{JSON.stringify(ev.meta, null, 2)}</pre>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Raw + Parsed */}
        <section className="mi-card">
          <div className="mi-card-header">
            <h3>Response Inspector</h3>
            <div className="mi-card-actions">
              {rawResponse && (
                <button type="button" className="mi-mini-btn" onClick={() => copyToClipboard(rawResponse)}>
                  Copy Raw
                </button>
              )}
            </div>
          </div>

          <div className="mi-split">
            <div className="mi-panel">
              <div className="mi-panel-title">RAW RESPONSE</div>
              <pre className="mono pre">{rawResponse || "—"}</pre>
            </div>

            <div className="mi-panel">
              <div className="mi-panel-title">PARSED JSON</div>
              <pre className="mono pre">{parsedResponse ? JSON.stringify(parsedResponse, null, 2) : "—"}</pre>
            </div>
          </div>

          <div className="mi-note">
            If JSON parsing fails, the RAW RESPONSE panel shows exactly what the server returned (HTML, stack trace, plain text, etc.).
            That’s the “no more guessing” guarantee.
          </div>
        </section>

        {/* Event Log */}
        <section className="mi-card mi-wide">
          <div className="mi-card-header">
            <h3>Event Log (Chronological)</h3>
            <div className="mi-card-actions">
              <button
                type="button"
                className="mi-mini-btn"
                disabled={combinedEvents.length === 0}
                onClick={() => copyToClipboard(JSON.stringify(combinedEvents, null, 2))}
              >
                Copy JSON
              </button>
            </div>
          </div>

          {combinedEvents.length === 0 ? (
            <div className="mi-empty">No events yet. Upload a PDF to begin.</div>
          ) : (
            <div className="mi-table-wrap">
              <table className="mi-table">
                <thead>
                  <tr>
                    <th style={{ width: 190 }}>Time</th>
                    <th style={{ width: 180 }}>Source</th>
                    <th style={{ width: 260 }}>Stage</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedEvents.map((ev, idx) => (
                    <tr key={idx}>
                      <td className="mono">{ev.ts || "—"}</td>
                      <td>
                        <span className={`mi-pill ${ev._source || "server"}`}>
                          {ev._source || "server"}
                        </span>
                      </td>
                      <td className="mono">{ev.stage}</td>
                      <td>{ev.message || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <details className="mi-raw-json">
                <summary>Show raw JSON</summary>
                <pre className="mono pre">{JSON.stringify(combinedEvents, null, 2)}</pre>
              </details>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
