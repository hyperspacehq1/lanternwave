"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const [status, setStatus] = useState(null);
  const [raw, setRaw] = useState("");
  const [json, setJson] = useState(null);

  async function load() {
    setStatus(null);
    setRaw("");
    setJson(null);

    const res = await fetch("/api/debug/account", {
      credentials: "include",
      cache: "no-store",
    });

    setStatus(res.status);

    const text = await res.text();
    setRaw(text);

    try {
      setJson(JSON.parse(text));
    } catch {
      setJson(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 32, fontFamily: "monospace" }}>
      <h1>My Account (Ultimate Debug)</h1>

      <div style={{ marginTop: 12 }}>
        <button onClick={load} style={{ padding: "8px 12px" }}>
          Reload Debug
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>HTTP Status:</strong>{" "}
        {status === null ? "Loading…" : status}
      </div>

      {json?.ok && json?.debug && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ margin: "18px 0 8px" }}>Summary</h2>
          <KV label="Cookie Names Seen (server)" value={(json.debug.server.sawCookies || []).join(", ") || "(none)"} />
          <KV label="lw_session Seen (server)" value={json.debug.server.sawLwSession} />
          <KV label="User ID" value={json.debug.auth.userId || "(null)"} />
          <KV label="Username" value={json.debug.auth.username || "(null)"} />
          <KV label="Email" value={json.debug.auth.email || "(null)"} />
          <KV label="Tenant ID" value={json.debug.auth.tenantId || "(null)"} />

          <h2 style={{ margin: "18px 0 8px" }}>Note</h2>
          <pre style={preStyle}>{json.note || "(none)"}</pre>

          <h2 style={{ margin: "18px 0 8px" }}>Server Header Snapshot</h2>
          <pre style={preStyle}>
            {JSON.stringify(json.debug.server.headers || {}, null, 2)}
          </pre>
        </div>
      )}

      <h2 style={{ margin: "18px 0 8px" }}>Raw Response</h2>
      <pre style={preStyle}>{raw || "(empty)"}</pre>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div style={{ marginTop: 6 }}>
      <strong>{label}:</strong>{" "}
      <span style={{ wordBreak: "break-all" }}>{String(value)}</span>
    </div>
  );
}

const preStyle = {
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "#fafafa",
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
