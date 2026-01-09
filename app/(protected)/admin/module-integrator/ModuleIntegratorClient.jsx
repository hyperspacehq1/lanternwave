"use client";

import { useState } from "react";

const STAGES = [
  "upload_received",
  "validated",
  "text_extracted",
  "structure_parsed",
  "schemas_executed",
  "chunked",
  "embedded",
  "persisted",
  "completed",
];

export default function ModuleIntegratorClient() {
  const [file, setFile] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentStage = events.at(-1)?.stage;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setEvents([]);
    setLoading(true);

    if (!file) {
      setError("Please select a PDF to upload.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/module-integrator", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Ingestion failed");
      }

      setEvents(data.events || []);
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="module-integrator">
      <h1>Module Integrator</h1>
      <div className="subtitle">
        Admin · AI Ingestion Dashboard
      </div>

      <form className="module-upload" onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Processing…" : "Upload PDF"}
        </button>
      </form>

      {error && (
        <div className="pipeline-error">
          {error}
        </div>
      )}

      {events.length > 0 && (
        <div className="pipeline">
          <h3>Ingestion Pipeline</h3>

          <ul className="pipeline-steps">
            {STAGES.map((stage) => {
              const event = events.find((e) => e.stage === stage);
              const completed = !!event;
              const active = currentStage === stage;

              return (
                <li
                  key={stage}
                  className={`pipeline-step ${
                    completed ? "completed" : ""
                  } ${active ? "active" : ""}`}
                >
                  {stage.replace(/_/g, " ")}
                  {event?.message && (
                    <span className="message">
                      {event.message}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <h3 style={{ marginTop: "2rem" }}>
            Event Log
          </h3>

          <div className="pipeline-log">
            {JSON.stringify(events, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}
