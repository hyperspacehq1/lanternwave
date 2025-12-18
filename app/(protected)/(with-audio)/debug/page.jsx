"use client";

import { useEffect, useState } from "react";

export default function DebugPage() {
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/debug")
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>Ultimate Debug Page</h1>

      {error && (
        <>
          <h2>Error</h2>
          <pre>{error}</pre>
        </>
      )}

      {data && (
        <>
          <h2>/api/debug response</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>

          <button
            style={{ marginTop: 12 }}
            onClick={() => {
              fetch(`/api/debug/${data.sampleId}`)
                .then(async (res) => {
                  if (!res.ok) throw new Error(await res.text());
                  return res.json();
                })
                .then(setDetail)
                .catch((err) => setError(err.message));
            }}
          >
            Call /api/debug/{data.sampleId}
          </button>
        </>
      )}

      {detail && (
        <>
          <h2>/api/debug/[id] response</h2>
          <pre>{JSON.stringify(detail, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
