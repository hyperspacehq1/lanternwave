"use client";

import "./module-integrator.css";
import { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
   STAGE → PROGRESS MAP (AUTHORITATIVE)
============================================================ */

const STAGE_PROGRESS = {
  job_created: { label: "Job created", progress: 0 },
  pdf_parsed: { label: "PDF parsed", progress: 10 },
  text_extracted: { label: "Text extracted", progress: 25 },
  ai_campaign_extraction: { label: "AI campaign extraction", progress: 40 },
  sessions_extracted: { label: "Sessions extracted", progress: 55 },
  entities_extracted: { label: "Entities extracted", progress: 75 },
  db_inserts_complete: { label: "DB inserts complete", progress: 90 },
  finalization: { label: "Finalization", progress: 100 },
};

/* ============================================================
   SCHEMA ORDER
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
  } catch {
    return { ok: false };
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
  const [jobId, setJobId] = useState(null);

  // pipeline timing
  const [uploadStartedAt, setUploadStartedAt] = useState(null);
  const [uploadFinishedAt, setUploadFinishedAt] = useState(null);
  const [requestStartedAt, setRequestStartedAt] = useState(null);
  const [requestFinishedAt, setRequestFinishedAt] = useState(null);

  // schema inspector
  const [expandedSchema, setExpandedSchema] = useState(null);

  const startedAtRef = useRef(null);
  const pollingRef = useRef(null);

  /* ============================================================
     BUSBOY TRANSPARENCY FLAGS (EXISTING)
  ============================================================ */

  const hasBusboyInit = events.some((e) => e.stage === "busboy_init");
  const hasBusboyFile = events.some(
    (e) => e.stage === "busboy_file_detected"
  );
  const hasBusboyComplete = events.some(
    (e) => e.stage === "busboy_complete"
  );

  /* ============================================================
     JOB-LEVEL PROGRESS (DERIVED)
  ============================================================ */

  const jobProgress = useMemo(() => {
    let max = 0;
    let stage = "Pending";

    for (const e of events) {
      const def = STAGE_PROGRESS[e.stage];
      if (!def) continue;

      if (def.progress >= max) {
        max = def.progress;
        stage = def.label;
      }
    }

    return { percent: max, stage };
  }, [events]);

  /* ============================================================
     SCHEMA PROGRESS (UNCHANGED)
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
     SUBMIT (UNCHANGED BEHAVIOR + jobId CAPTURE)
  ============================================================ */

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setEvents([]);
    setRawResponse("");
    setJobId(null);
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
        headers: { "x-request-id": rid },
      });

      const text = await res.text();
      setRawResponse(text);
      setRequestFinishedAt(nowIso());

      const parsed = safeJsonParse(text);
      if (!parsed.ok) {
        setError("Non-JSON server response");
        return;
      }

      if (!res.ok) {
        throw new Error(parsed.value?.error || "Import failed");
      }

      if (parsed.value?.jobId) {
        setJobId(parsed.value.jobId);
      }

      if (parsed.value?.events) {
        setEvents(parsed.value.events);
      }
    } catch (err) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     POLLING (NEW, ADDITIVE)
  ============================================================ */

  useEffect(() => {
    if (!jobId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ingestion-jobs/${jobId}`);
        const json = await res.json();
        if (!json.ok) return;

        const stageKey = Object.keys(STAGE_PROGRESS).find(
          (k) =>
            STAGE_PROGRESS[k].label === json.job.current_stage
        );

        if (stageKey) {
          setEvents((prev) => {
            if (prev.some((e) => e.stage === stageKey)) return prev;
            return [...prev, { stage: stageKey }];
          });
        }

        if (
          json.job.status === "completed" ||
          json.job.status === "failed"
        ) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch {
        // silent — polling must be resilient
      }
    }, 1500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [jobId]);

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="module-integrator">
      <h1>Module Integrator</h1>

      <div className="mi-layout">
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
                <b>Multipart Parsing:</b>{" "}
                {hasBusboyComplete
                  ? "Completed"
                  : hasBusboyFile
                  ? "Streaming PDF…"
                  : hasBusboyInit
                  ? "Initializing…"
                  : loading
                  ? "Pending…"
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

            <div className="job-progress">
              <div className="job-progress-label">
                {jobProgress.stage}
              </div>
              <div className="job-progress-bar">
                <div
                  className="job-progress-fill"
                  style={{ width: `${jobProgress.percent}%` }}
                />
              </div>
              <div className="job-progress-percent">
                {jobProgress.percent}%
              </div>
            </div>
          </section>

          {error && (
            <div className="pipeline-error">
              <b>Error:</b> {error}
            </div>
          )}
        </div>

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
