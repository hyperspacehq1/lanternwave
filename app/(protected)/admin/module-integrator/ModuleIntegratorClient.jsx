"use client";

import { useState } from "react";

export default function ModuleIntegratorClient() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/module-integrator", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setMessage(data.message || "Done");
  }

  return (
    <div>
      <h1>Module Integrator</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button type="submit">Upload</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}
