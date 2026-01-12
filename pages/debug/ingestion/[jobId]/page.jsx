"use client";

import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL = 1500;

export default function IngestionDebugPage({ params }) {
  const { jobId } = params;

  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(true);
  const lastUpdatedRef = useRef(null);

  useEffect(() => {
    if (!jobId || !polling) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/ingestion-jobs/${jobId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        setJob(data);

        // Stop polling on terminal states
        if (data.status === "failed" || data.status === "completed") {
          setPolling(false);
        }

        lastUpdatedRef.current = new Date().toISOString();
      } catch (err) {
        setError(err.message);
        setPolling(false);
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [jobId, polling]);

  const statusColor =
    job?.status === "failed"
      ? "#b91c1c"
      : job?.status === "completed"
      ? "#166534"
      : "#a16207";

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Ingestion Debug</h1>

      <div style={styles.meta}>
        <div><strong>Job ID:</strong> {jobId}</div>
        <div>
          <strong>Polling:</strong>{" "}
          {polling ? "ACTIVE" : "STOPPED"}
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!job && !error && (
        <div style={styles.pending}>Loading job state…</div>
      )}

      {job && (
        <>
          {/* Execution State */}
          <div style={{ ...styles.card, borderColor: statusColor }}>
            <h2 style={{ color: statusColor }}>Execution State</h2>

            <div><strong>Status:</strong> {job.status}</div>
            <div><strong>Progress:</strong> {job.progress}%</div>
            <div>
              <strong>Current Stage:</strong>
              <pre style={styles.stage}>{job.current_stage}</pre>
            </div>

            {lastUpdatedRef.current && (
              <div style={styles.updated}>
                Last polled: {lastUpdatedRef.current}
              </div>
            )}
          </div>

          {/* Derived Timeline */}
          <div style={styles.card}>
            <h2>Derived Timeline</h2>
            <ul style={styles.timeline}>
              <li>✔ Job created</li>
              {job.current_stage?.startsWith("PDF parse failed") && (
                <li style={styles.fail}>✖ PDF parse failed</li>
              )}
              {job.current_stage?.startsWith("Debug stop") && (
                <li style={styles.success}>✔ Debug stop reached</li>
              )}
            </ul>
          </div>

          {/* Raw DB Payload */}
          <div style={styles.card}>
            <h2>Raw Job Record (DB)</h2>
            <pre style={styles.json}>
              {JSON.stringify(job, null, 2)}
            </pre>
          </div>

          {/* Truth Banner */}
          <div style={styles.notice}>
            <strong>Note:</strong> Request “events” only confirm receipt.
            Execution state above is authoritative.
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- styles ---------------- */

const styles = {
  page: {
    padding: 24,
    fontFamily: "monospace",
    background: "#020617",
    color: "#e5e7eb",
    minHeight: "100vh",
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
  meta: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 16,
  },
  pending: {
    color: "#facc15",
  },
  error: {
    background: "#7f1d1d",
    padding: 12,
    borderRadius: 6,
  },
  card: {
    border: "1px solid #334155",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    background: "#020617",
  },
  stage: {
    background: "#020617",
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
    whiteSpace: "pre-wrap",
  },
  timeline: {
    listStyle: "none",
    paddingLeft: 0,
  },
  fail: {
    color: "#f87171",
  },
  success: {
    color: "#4ade80",
  },
  json: {
    background: "#020617",
    padding: 12,
    borderRadius: 6,
    overflowX: "auto",
  },
  updated: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.6,
  },
  notice: {
    marginTop: 24,
    fontSize: 13,
    opacity: 0.75,
  },
};
