"use client";

import "./module-integrator.css";
import { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
   STAGE → PROGRESS MAP (JOB-LEVEL)
   NOTE: This is JOB progress (from polling/events). We ALSO
   show pre-job phases below so the UI doesn’t look “stuck”.
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
   SCHEMA ORDER (INSPECTOR TABS)
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

function fmtMs(ms) {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function diffMs(aIso, bIso) {
  if (!aIso || !bIso) return null;
  return new Date(bIso).getTime() - new Date(aIso).getTime();
}

/* ============================================================
   COMPONENT
============================================================ */

export default function ModuleIntegratorClient() {
  const [file, setFile] = useState(null);

  // server/job events (schema + db + error)
  const [events, setEvents] = useState([]);

  // UI transparency
  const [rawResponse, setRawResponse] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

// metadata inspector
const [showMetadata, setShowMetadata] = useState(false);
const [metadata, setMetadata] = useState(null);
const [metadataLoading, setMetadataLoading] = useState(false);

  // request state
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [jobId, setJobId] = useState(null);

  // timings
  const [uploadStartedAt, setUploadStartedAt] = useState(null);
  const [uploadFinishedAt, setUploadFinishedAt] = useState(null);
  const [requestStartedAt, setRequestStartedAt] = useState(null);
  const [requestFinishedAt, setRequestFinishedAt] = useState(null);

  // inspector
  const [expandedSchema, setExpandedSchema] = useState(null);

  // client-side pipeline (pre-job phases)
  const [phase, setPhase] = useState("idle"); // idle | ready | uploading | requesting | parsing | accepted | polling | done | failed
  const [phaseNotes, setPhaseNotes] = useState("");

  const pollingRef = useRef(null);
  const requestWatchdogRef = useRef(null);
  const pollWatchdogRef = useRef(null);
  const lastProgressAtRef = useRef(null);

async function loadMetadata() {
  if (!jobId) return;

  setMetadataLoading(true);
  try {
    const res = await fetch(`/api/ingestion-jobs/${jobId}/metadata`);
    const json = await res.json();
    setMetadata(json?.metadata ?? {});
  } catch {
    setMetadata({ error: "Failed to load metadata" });
  } finally {
    setMetadataLoading(false);
  }
}

  /* ============================================================
     DERIVED: campaign status + fatal errors
  ============================================================ */

 const fatalErrors = useMemo(() => {
  const eventErrors = events.filter((e) => e.stage === "error");
  if (eventErrors.length) return eventErrors;

  // Fallback to job-level failure
  if (phase === "failed" && phaseNotes?.includes("[error]")) {
    return [
      {
        stage: "error",
        meta: { message: phaseNotes },
      },
    ];
  }

  return [];
}, [events, phase, phaseNotes]);

  const campaignEvents = useMemo(
    () => events.filter((e) => e?.meta?.tableName === "campaigns"),
    [events]
  );

  const campaignStatus = useMemo(() => {
    const created = campaignEvents.find((e) => e.stage === "db_insert_row");
    const skipped = campaignEvents.find((e) => e.stage === "schema_skipped");
    const errored = campaignEvents.find((e) => e.stage === "error");

    if (created) return { state: "created" };
    if (errored) return { state: "error", reason: errored?.meta?.message };
    if (skipped) return { state: "skipped", reason: skipped?.meta?.reason };
    return { state: "pending" };
  }, [campaignEvents]);

  /* ============================================================
     DERIVED: job-level progress (from events)
  ============================================================ */

const jobProgress = useMemo(() => {
  // Prefer event-driven progress
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

  // Fallback: derive from job stage text if no events
  if (max === 0 && phaseNotes) {
    if (phaseNotes.includes("PDF uploaded")) {
      return { percent: 30, stage: "PDF uploaded" };
    }
    if (phaseNotes.includes("schema")) {
      return { percent: 60, stage: "Schema processing" };
    }
    if (phaseNotes.includes("completed")) {
      return { percent: 100, stage: "Completed" };
    }
    if (phaseNotes.includes("[error]")) {
      return { percent: 45, stage: "Error" };
    }
  }

  return { percent: max, stage };
}, [events, phaseNotes]);

  /* ============================================================
     DERIVED: pre-job pipeline (what user expects to see)
  ============================================================ */

  const pipelineLines = useMemo(() => {
    const uploadMs = diffMs(uploadStartedAt, uploadFinishedAt);
    const requestMs = diffMs(requestStartedAt, requestFinishedAt);

    // We model four human-readable phases that match your earlier UI:
    // Upload, Server Request, Multipart Parsing, Schema Processing
    const upload =
      phase === "uploading"
        ? { state: "In progress…", ms: null }
        : uploadFinishedAt
        ? { state: "Completed", ms: uploadMs }
        : uploadStartedAt
        ? { state: "Started…", ms: null }
        : { state: "Pending", ms: null };

    const serverRequest =
      phase === "requesting"
        ? { state: "In progress…", ms: null }
        : requestFinishedAt
        ? { state: "Completed", ms: requestMs }
        : requestStartedAt
        ? { state: "Started…", ms: null }
        : { state: "Pending", ms: null };

    // Multipart parsing becomes “Completed” once the server returns 202/jobId or events
    const multipartParsing =
      phase === "parsing"
        ? { state: "In progress…", ms: null }
        : phase === "accepted" || jobId
        ? { state: "Completed", ms: null }
        : { state: "Pending", ms: null };

    // Schema processing depends on job events
    const schemaProcessing =
      jobId && (phase === "polling" || phase === "done")
        ? fatalErrors.length
          ? { state: "Failed", ms: null }
          : events.length
          ? { state: "In progress / Completed", ms: null }
          : { state: "Waiting for events…", ms: null }
        : { state: "Pending", ms: null };

    return { upload, serverRequest, multipartParsing, schemaProcessing };
  }, [
    phase,
    uploadStartedAt,
    uploadFinishedAt,
    requestStartedAt,
    requestFinishedAt,
    jobId,
    events.length,
    fatalErrors.length,
  ]);

  /* ============================================================
     SUBMIT
  ============================================================ */

  async function handleSubmit(e) {
    e.preventDefault();

    // reset UI
    setError("");
    setWarning("");
    setEvents([]);
    setRawResponse("");
    setJobId(null);
    setExpandedSchema(null);
    setShowRaw(false);
    setPhaseNotes("");

    if (!file) {
      setError("Please select a PDF to upload.");
      setPhase("failed");
      return;
    }

    // clear existing intervals/timeouts
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (requestWatchdogRef.current) {
      clearTimeout(requestWatchdogRef.current);
      requestWatchdogRef.current = null;
    }
    if (pollWatchdogRef.current) {
      clearInterval(pollWatchdogRef.current);
      pollWatchdogRef.current = null;
    }

    const rid = makeRequestId();
    setRequestId(rid);

    setLoading(true);
    setPhase("uploading");
    setUploadStartedAt(nowIso());
    setUploadFinishedAt(null);
    setRequestStartedAt(null);
    setRequestFinishedAt(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("requestId", rid);

    // Watchdog: if server request hangs, show a warning
    requestWatchdogRef.current = setTimeout(() => {
      setWarning(
        "Upload/request is taking longer than expected. Check nginx/proxy timeouts, server logs, and PDF size."
      );
    }, 20000);

    try {
      // We can’t measure true browser upload time precisely here,
      // but we at least move the UI through phases so it’s not “stuck”.
      setUploadFinishedAt(nowIso());
      setPhase("requesting");
      setRequestStartedAt(nowIso());

      const res = await fetch("/api/admin/module-integrator", {
        method: "POST",
        body: formData,
        headers: { "x-request-id": rid },
      });

      const text = await res.text();
      setRawResponse(text);
      setRequestFinishedAt(nowIso());
      setPhase("parsing");

      if (requestWatchdogRef.current) {
        clearTimeout(requestWatchdogRef.current);
        requestWatchdogRef.current = null;
      }

      const parsed = safeJsonParse(text);
      if (!parsed.ok) {
        setError("Non-JSON server response (open Raw Response to inspect).");
        setShowRaw(true);
        setPhase("failed");
        return;
      }

      if (!res.ok) {
        throw new Error(parsed.value?.error || "Import failed");
      }

      // accepted
      const nextJobId = parsed.value?.jobId || null;
      if (!nextJobId) {
        setWarning(
          "Server returned OK but did not include jobId. Check API response shape."
        );
      } else {
        setJobId(nextJobId);
        setPhase("accepted");
      }

      // preserve any initial server events
      if (Array.isArray(parsed.value?.events)) {
        setEvents(parsed.value.events);
      }

      // Immediately transition into polling so the UI shows progression
      if (nextJobId) {
        setPhase("polling");
        lastProgressAtRef.current = Date.now();
      }
    } catch (err) {
      setError(err?.message || "Unexpected error");
      setPhase("failed");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     POLLING (jobs)
     Note: Polling endpoint returns job row, not schema events.
     We keep polling even if events array is empty, because the
     backend may be writing DB rows without emitting inspector events yet.
  ============================================================ */

  useEffect(() => {
    if (!jobId) return;

    // poll job status
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ingestion-jobs/${jobId}`);
        const json = await res.json();
        if (!json?.ok) return;

        const status = json?.job?.status;
        const progress = json?.job?.progress;
        const stage = json?.job?.current_stage;

        // keep the UI from looking dead even if schema events aren’t flowing:
        setPhaseNotes(
          stage ? `Job stage: ${stage} • Progress: ${progress ?? "?"}` : ""
        );

        // watchdog “stuck” detection: if progress never changes, warn
        if (typeof progress === "number") {
          const now = Date.now();
          // if we see any progress > 0 we consider that movement
          if (progress > 0) lastProgressAtRef.current = now;

          const last = lastProgressAtRef.current || now;
          if (now - last > 45000) {
            setWarning(
              "Job progress has not advanced in ~45s. Check server logs, OpenAI calls, and DB inserts. (This warning does not stop the job.)"
            );
            lastProgressAtRef.current = now; // prevent spamming
          }
        }

        if (status === "completed") {
          setPhase("done");
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }

        if (status === "failed") {
  setPhase("failed");

  // 🔎 Auto-open metadata on failure (QoL fix)
  if (!showMetadata) {
    loadMetadata();
    setShowMetadata(true);
  }

  setWarning(
    "Job failed. Metadata has been loaded with detailed error information."
  );

  if (pollingRef.current) {
    clearInterval(pollingRef.current);
    pollingRef.current = null;
  }
}
      } catch {
        // ignore transient polling failures
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
        {/* LEFT */}
        <div className="mi-left">
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <button type="submit" disabled={loading}>
                {loading ? "Processing…" : "Upload PDF"}
              </button>
              {file?.name ? (
                <span style={{ opacity: 0.9 }}>{file.name}</span>
              ) : null}
            </div>
          </form>

          <section className="mi-card">
            <h3>Import Pipeline</h3>

            {/* PRE-JOB PHASES (this prevents “0% / pending” confusion) */}
            <ul style={{ marginTop: 12 }}>
              <li>
                <b>Upload:</b> {pipelineLines.upload.state}
                {pipelineLines.upload.ms != null
                  ? ` (${fmtMs(pipelineLines.upload.ms)})`
                  : ""}
              </li>
              <li>
                <b>Server Request:</b> {pipelineLines.serverRequest.state}
                {pipelineLines.serverRequest.ms != null
                  ? ` (${fmtMs(pipelineLines.serverRequest.ms)})`
                  : ""}
              </li>
              <li>
                <b>Multipart Parsing:</b> {pipelineLines.multipartParsing.state}
              </li>
              <li>
                <b>Schema Processing:</b> {pipelineLines.schemaProcessing.state}
              </li>
            </ul>

            {/* JOB-LEVEL PROGRESS BAR */}
            <div className="job-progress" style={{ marginTop: 14 }}>
              <div className="job-progress-label">{jobProgress.stage}</div>
              <div className="job-progress-bar">
                <div
                  className="job-progress-fill"
                  style={{ width: `${jobProgress.percent}%` }}
                />
              </div>
              <div className="job-progress-percent">{jobProgress.percent}%</div>
            </div>

            {/* CAMPAIGN DETECTION */}
            <div className="campaign-status" style={{ marginTop: 10 }}>
              <b>Campaign:</b>{" "}
              {campaignStatus.state === "created" && "Created"}
              {campaignStatus.state === "skipped" &&
                `Skipped — ${campaignStatus.reason}`}
              {campaignStatus.state === "error" &&
                `Error — ${campaignStatus.reason}`}
              {campaignStatus.state === "pending" && "Pending"}
            </div>

            {/* REQUEST DEBUG */}
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
              <div>
                <b>requestId:</b> {requestId || "—"}
              </div>
              <div>
                <b>jobId:</b> {jobId || "—"}
              </div>
              {phaseNotes ? (
                <div style={{ marginTop: 6 }}>
                  <b>Status:</b> {phaseNotes}
                </div>
              ) : null}
            </div>
          </section>

          {/* ERRORS / WARNINGS */}
          {warning ? (
            <div className="pipeline-warning" style={{ marginTop: 12 }}>
              <b>Warning:</b> {warning}
            </div>
          ) : null}

          {fatalErrors.length > 0 ? (
            <div className="pipeline-error" style={{ marginTop: 12 }}>
              <b>Errors detected:</b>
              <ul>
                {fatalErrors.map((e, i) => (
                  <li key={i}>{e.meta?.message || "Unknown error"}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <div className="pipeline-error" style={{ marginTop: 12 }}>
              <b>Error:</b> {error}
            </div>
          ) : null}

          {/* RAW RESPONSE + METADATA */}
{rawResponse ? (
  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
    <button
      type="button"
      onClick={() => setShowRaw((v) => !v)}
    >
      {showRaw ? "Hide" : "Show"} Raw Server Response
    </button>

    <button
      type="button"
      onClick={() => {
        if (showMetadata) {
          setShowMetadata(false);
        } else {
          loadMetadata();
          setShowMetadata(true);
        }
      }}
      disabled={!jobId}
    >
      {showMetadata ? "Hide" : "View"} Metadata
    </button>
  </div>
) : null}

{showMetadata ? (
  <pre
    style={{
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      border: "1px solid rgba(255,255,255,0.15)",
      padding: 10,
      borderRadius: 8,
      maxHeight: 260,
      overflow: "auto",
      marginTop: 8,
    }}
  >
    {metadataLoading
      ? "Loading metadata…"
      : JSON.stringify(metadata, null, 2)}
  </pre>
) : null}

              {showRaw ? (
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    border: "1px solid rgba(255,255,255,0.15)",
                    padding: 10,
                    borderRadius: 8,
                    maxHeight: 260,
                    overflow: "auto",
                  }}
                >
                  {rawResponse}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* RIGHT */}
        <div className="mi-right">
          <div className="mi-schema-list">
            {SCHEMA_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setExpandedSchema(s)}
                className={expandedSchema === s ? "active" : ""}
              >
                {titleCase(s)}
              </button>
            ))}
          </div>

          {expandedSchema ? (
            <div className="mi-inspector">
              <h3>{titleCase(expandedSchema)} Events</h3>

              {/* Helpful empty state */}
              {events.filter((e) => e?.meta?.tableName === expandedSchema)
                .length === 0 ? (
                <div style={{ opacity: 0.85 }}>
                  No events recorded for <b>{expandedSchema}</b> yet.
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    Tip: If your orchestrator only updates job stages and does
                    not emit schema events, this will remain empty. Use “Raw
                    Server Response” and server logs to diagnose.
                  </div>
                </div>
              ) : (
                <ul className="mi-event-list">
                  {events
                    .filter((e) => e?.meta?.tableName === expandedSchema)
                    .map((e, i) => (
                      <li key={i} className="mi-event">
                        <div className="mi-event-stage">{e.stage}</div>
                        <div style={{ fontSize: 13, opacity: 0.9 }}>
                          {e.message ? e.message : null}
                        </div>
                        {e.meta ? (
                          <pre className="mi-event-meta">
                            {JSON.stringify(e.meta, null, 2)}
                          </pre>
                        ) : null}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="mi-inspector">
              <h3>Select a schema to inspect events</h3>
              <div style={{ opacity: 0.85 }}>
                Upload a PDF to start ingestion. Use the left panel to see
                request/job status even before schema events appear.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
