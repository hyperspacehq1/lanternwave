"use client";

import { useState } from "react";

export default function ModuleIntegratorPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/module-integrator", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Ingestion failed");
      }

      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <h1>Module Integrator</h1>
      <p>
        Upload an RPG module PDF to generate an Adventure Codex.
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
          disabled={loading}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Processing…" : "Create Adventure Codex"}
        </button>
      </form>

      {error && (
        <p className="error">
          ❌ {error}
        </p>
      )}

      {status && (
        <div className="success">
          <h3>✅ Adventure Codex Created</h3>
          <p><strong>Name:</strong> {status.name}</p>
          <p><strong>ID:</strong> {status.templateCampaignId}</p>
          <p>
            This codex is now available in the Campaign
            creation dropdown.
          </p>
        </div>
      )}
    </div>
  );
}
