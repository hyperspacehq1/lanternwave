"use client";

import { useEffect, useState } from "react";

export default function AccountDebugPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      console.log("🧪 ACCOUNT LOAD START");

      try {
        const res = await fetch("/api/account", {
          method: "GET",
          credentials: "include",
        });

        const text = await res.text();
        let json = null;

        try {
          json = JSON.parse(text);
        } catch {
          json = { raw: text };
        }

        if (cancelled) return;

        console.log("🧪 ACCOUNT LOAD RESPONSE", {
          status: res.status,
          ok: res.ok,
          body: json,
        });

        setStatus(res.status);
        setResponse(json);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        console.error("❌ ACCOUNT LOAD ERROR", err);
        setError(err.message || String(err));
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "monospace",
        background: "#0b0b0b",
        color: "#e6e6e6",
        minHeight: "100vh",
      }}
    >
      <h1>🧪 Account Debug Page (DEV)</h1>

      {loading && <p>Loading…</p>}

      <section style={{ marginTop: 24 }}>
        <h2>Browser Cookie Visibility</h2>
        <pre>{document.cookie || "(no cookies visible to JS)"}</pre>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Fetch Result</h2>
        <pre>
          {JSON.stringify(
            {
              status,
              response,
              error,
            },
            null,
            2
          )}
        </pre>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Notes</h2>
        <ul>
          <li>
            If <code>document.cookie</code> is empty → cookie is HttpOnly
            (expected).
          </li>
          <li>
            If status is <code>401</code> → server did not accept session.
          </li>
          <li>
            If response contains <code>Unauthorized</code> →{" "}
            <code>requireAuth()</code> rejected request.
          </li>
        </ul>
      </section>
    </div>
  );
}
