"use client";

import { useState } from "react";

export default function ModuleIntegratorClient() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setStatus("Uploading file…");

    if (!file) {
      setError("Please select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/module-integrator", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      console.log("📨 Server response:", text);

      if (!res.ok) {
        throw new Error(text);
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { message: text };
      }

      setStatus(
        parsed?.status ||
          "Upload accepted. Processing in background..."
      );
    } catch (err) {
      console.error("❌ Upload error:", err);
      setError(err.message || "Unexpected error");
    }
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          background: "#8b0000",
          color: "#fff",
          padding: "6px 12px",
          fontSize: "13px",
          zIndex: 9999,
          fontFamily: "monospace",
        }}
      >
        DEBUG MODE — Module Integrator (Active)
      </div>

      <div style={{ maxWidth: 600, margin: "4rem auto" }}>
        <h1>Module Integrator</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button type="submit" style={{ marginLeft: "1rem" }}>
            Upload
          </button>
        </form>

        {status && (
          <p style={{ color: "limegreen", marginTop: "1rem" }}>
            {status}
          </p>
        )}

        {error && (
          <pre
            style={{
              color: "red",
              whiteSpace: "pre-wrap",
              marginTop: "1rem",
            }}
          >
            {error}
          </pre>
        )}
      </div>
    </>
  );
}
