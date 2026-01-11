"use client";

import { useMemo, useRef, useState } from "react";

/* ============================================================
   SCHEMA ORDER (authoritative display order)
============================================================ */

const SCHEMA_ORDER = [
  "campaigns",
  "sessions",
  "events",
  "npcs",
  "locations",
  "items",
  "encounters",
];

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function makeRequestId() {
  return `ing_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function msSince(startIso) {
  if (!startIso) return "";
  const ms = Date.now() - new Date(startIso).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/* ============================================================
   COMPONENT
============================================================ */

export default function ModuleIntegratorClient() {
  const [file, setFile] = useState(null);
  const [events, setEvents] = useState([]);
  const [rawResponse, setRawResponse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState("");

  // NEW: pipeline timing (existing behavior preserved)
  const [uploadStartedAt, setUploadStartedAt] = useState(null);
  const [uploadFinishedAt, setUploadFinishedAt] = useState(null);
  const [requestStartedAt, setRequestStartedAt] = useState(null);
  const [requestFinishedAt, setRequestFinishedAt] = useState(null);

  // NEW: schema inspector
  const [expandedSchema, setExpandedSchema] = useState(null);

  const startedAtRef = useRef(null);

  /* ============================================================
     SCHEMA PROGRESS DERIVATION (UNCHANGED LOGIC)
  ============================================================ */

  const schemaProgress = useMemo(() => {
    const state = {};

    for (const schema of SCHEMA_ORDER) {
      state[schema] = {
        extracting: false,
        inserting: false,
        completed: false,
        error: false,
      };
    }

    for (const ev of events) {
      const table = ev?.meta?.tableName;
      if (!table || !state[table]) continue;

      if (ev.stage === "schema_extract_start") {
        state[table].extracting = true;
      }

      if (ev.stage === "db_insert_start") {
        state[table].inserting = true;
      }

      if (ev.stage === "db_insert_done") {
        state[table].completed = true;
      }

      if (ev.stage === "error") {
        state[table].error = true;
      }
    }

    return state;
  }, [events]);

  /* ============================================================
     SUBMIT (UNCHANGED LOGIC)
  ============================================================ */

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setEvents([]);
    setRawResponse("");
    setUploadStartedAt(null);
    setUploadFinishedAt(null);
    setRequestStartedAt(null);
    setRequestFinishedAt(null);
    setExpandedSchema(null);

    if (!file) {
      setError("Please select a PDF to upload.");
      return;
    }

    const rid = makeRequestId();
    setRequestId(rid);
    startedAtRef.current = nowIso();
    setLoading(true);

    setUploadStartedAt(nowIso());

    const formData = new FormData();
    formData.append("file", file);
    formData.append("requestId", rid);

    try {
      setUploadFinishedAt(nowIso());
      setRequestStartedAt(nowIso());

      const res = await fetch("/api/admin/module-integrator", {
        method: "POST",
        body: formData,
        headers: {
          "x-request-id": rid,
        },
      });

      const text = await res.text();
      setRawResponse(text);
      setRequestFinishedAt(nowIso());

      const parsed = safeJsonParse(text);
      if (!parsed.ok) {
        setError("Non-JSON server response");
        setRawResponse(text);
        return;
      }

      if (!res.ok) {
        throw new Error(parsed.value?.error || "Import failed");
      }

      setEvents(parsed.value?.events || []);
    } catch (err) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="module-integrator">
      <h1>Module Integrator</h1>

      <div className="mi-layout">
        {/* ================= LEFT COLUMN ================= */}

        <div className="mi-left">
          <form onSubmit={handleSubmit}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button type="submit" disabled={loading}>
              {loading ? "Processing…" : "Upload PDF"}
            </button>
          </form>

          {/* PIPELINE OVERVIEW */}

          <section className="mi-card">
            <h3>Import Pipeline</h3>
            <ul className="pipeline-overview">
              <li>
                <b>Upload:</b>{" "}
                {uploadStartedAt
                  ? uploadFinishedAt
                    ? `Completed (${msSince(uploadStartedAt)})`
                    : "In progress…"
                  : "Pending"}
              </li>
              <li>
                <b>Server Request:</b>{" "}
                {requestStartedAt
                  ? requestFinishedAt
                    ? `Completed (${msSince(requestStartedAt)})`
                    : "In progress…"
                  : "Pending"}
              </li>
              <li>
                <b>Schema Processing:</b>{" "}
                {events.length
                  ? "In progress / Completed"
                  : loading
                  ? "Waiting…"
                  : "Pending"}
              </li>
            </ul>
          </section>

          {/* SCHEMA BOARD */}

          <section className="mi-card">
            <h3>Schema Processing</h3>

            <ul className="schema-progress">
              {SCHEMA_ORDER.map((schema) => {
                const s = schemaProgress[schema];

                let status = "Pending";
                if (s.error) status = "Error";
                else if (s.completed) status = "Completed";
                else if (s.inserting) status = "Inserting…";
                else if (s.extracting) status = "Extracting…";
                else if (loading) status = "Waiting…";

                return (
                  <li
                    key={schema}
                    className={`schema-row ${status
                      .toLowerCase()
                      .replace("…", "")}`}
                    onClick={() => setExpandedSchema(schema)}
                  >
                    <span className="schema-name">
                      {titleCase(schema)}
                    </span>
                    <span className="schema-status">{status}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {error && (
            <div className="pipeline-error">
              <b>Error:</b> {error}
            </div>
          )}

          {rawResponse && (
            <section className="mi-card">
              <h3>Raw Server Response</h3>
              <pre className="mono pre">{rawResponse}</pre>
            </section>
          )}
        </div>

        {/* ================= RIGHT COLUMN ================= */}

        <div className="mi-right">
          {!expandedSchema ? (
            <div className="mi-inspector-empty">
              Select a schema to inspect events
            </div>
          ) : (
            <div className="mi-inspector">
              <h3>{titleCase(expandedSchema)} Events</h3>

              <ul className="mi-event-list">
                {events
                  .filter(
                    (e) =>
                      e?.meta?.tableName === expandedSchema
                  )
                  .map((e, i) => (
                    <li key={i} className="mi-event">
                      <div className="mi-event-stage">
                        {e.stage}
                      </div>
                      <div className="mi-event-time">
                        {e.timestamp || ""}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
