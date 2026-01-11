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
  ai_campaign_extraction: {
    label: "AI campaign extraction",
    progress: 40,
  },
  sessions_extracted: { label: "Sessions extracted", progress: 55 },
  entities_extracted: { label: "Entities extracted", progress: 75 },
  db_inserts_complete: {
    label: "DB inserts complete",
    progress: 90,
  },
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

  const [uploadStartedAt, setUploadStartedAt] = useState(null);
  const [uploadFinishedAt, setUploadFinishedAt] = useState(null);
  const [requestStartedAt, setRequestStartedAt] = useState(null);
  const [requestFinishedAt, setRequestFinishedAt] = useState(null);

  const [expandedSchema, setExpandedSchema] = useState(null);

  const startedAtRef = useRef(null);
  const pollingRef = useRef(null);

  /* ============================================================
     DERIVED FLAGS
  ============================================================ */

  const fatalErrors = events.filter((e) => e.stage === "error");

  const campaignEvents = events.filter(
    (e) => e?.meta?.tableName === "campaigns"
  );

  const campaignStatus = useMemo(() => {
    const created = campaignEvents.find(
      (e) => e.stage === "db_insert_row"
    );
    const skipped = campaignEvents.find(
      (e) => e.stage === "schema_skipped"
    );
    const errored = campaignEvents.find(
      (e) => e.stage === "error"
    );

    if (created) return { state: "created" };
    if (errored)
      return {
        state: "error",
        reason: errored?.meta?.message,
      };
    if (skipped)
      return {
        state: "skipped",
        reason: skipped?.meta?.reason,
      };

    return { state: "pending" };
  }, [campaignEvents]);

  /* ============================================================
     JOB-LEVEL PROGRESS
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
     SUBMIT
  ============================================================ */

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setEvents([]);
    setRawResponse("");
    setJobId(null);
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
     POLLING
  ============================================================ */

  useEffect(() => {
    if (!jobId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ingestion-jobs/${jobId}`);
        const json = await res.json();
        if (!json.ok) return;

        if (
          json.job.status === "completed" ||
          json.job.status === "failed"
        ) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch {}
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
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
            />
            <button type="submit" disabled={loading}>
              {loading ? "Processing…" : "Upload PDF"}
            </button>
          </form>

          <section className="mi-card">
            <h3>Import Pipeline</h3>

            <div className="job-progress">
              <div className="job-progress-label">
                {jobProgress.stage}
              </div>
              <div className="job-progress-bar">
                <div
                  className="job-progress-fill"
                  style={{
                    width: `${jobProgress.percent}%`,
                  }}
                />
              </div>
              <div className="job-progress-percent">
                {jobProgress.percent}%
              </div>
            </div>

            <div className="campaign-status">
              <b>Campaign:</b>{" "}
              {campaignStatus.state === "created" &&
                "Created"}
              {campaignStatus.state === "skipped" &&
                `Skipped — ${campaignStatus.reason}`}
              {campaignStatus.state === "error" &&
                `Error — ${campaignStatus.reason}`}
              {campaignStatus.state === "pending" &&
                "Pending"}
            </div>
          </section>

          {fatalErrors.length > 0 && (
            <div className="pipeline-error">
              <b>Errors detected:</b>
              <ul>
                {fatalErrors.map((e, i) => (
                  <li key={i}>
                    {e.meta?.message || "Unknown error"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="pipeline-error">
              <b>Error:</b> {error}
            </div>
          )}
        </div>

        <div className="mi-right">
          <div className="mi-schema-list">
            {SCHEMA_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setExpandedSchema(s)}
                className={
                  expandedSchema === s ? "active" : ""
                }
              >
                {titleCase(s)}
              </button>
            ))}
          </div>

          {expandedSchema && (
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
                      {e.meta && (
                        <pre className="mi-event-meta">
                          {JSON.stringify(
                            e.meta,
                            null,
                            2
                          )}
                        </pre>
                      )}
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
