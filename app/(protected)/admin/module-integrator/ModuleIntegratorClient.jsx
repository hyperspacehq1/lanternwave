"use client";

import { useState } from "react";

export default function ModuleIntegratorClient() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus("Uploading...");

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

      const text = await res.text(); // <-- IMPORTANT

      if (!res.ok) {
        // Show raw server error
        throw new Error(text || "Server error");
      }

      // Try parsing JSON safely
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      setStatus(data.message || "Upload successful!");
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err.message || "Unexpected error occurred.");
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto" }}>
      <h1>Module Integrator</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button type="submit">Upload</button>
      </form>

      {status && <p style={{ color: "green" }}>{status}</p>}
      {error && <pre style={{ color: "red" }}>{error}</pre>}
    </div>
  );
}
