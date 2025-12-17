"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/debug/account", {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load account");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ padding: 32, fontFamily: "monospace" }}>
      <h1>My Account (Debug)</h1>

      {error && (
        <div style={{ color: "red", marginTop: 16 }}>
          ERROR: {error}
        </div>
      )}

      {!data && !error && <div>Loading…</div>}

      {data?.ok && (
        <table
          style={{
            marginTop: 24,
            borderCollapse: "collapse",
          }}
        >
          <tbody>
            <Row label="Username" value={data.user.username} />
            <Row label="Email" value={data.user.email} />
            <Row label="User ID" value={data.user.id} />
            <Row label="Tenant ID" value={data.tenant.id} />
            <Row
              label="Cookie (lw_session)"
              value={
                data.cookie.value
                  ? data.cookie.value
                  : "(not present)"
              }
            />
          </tbody>
        </table>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <td
        style={{
          padding: "6px 12px",
          borderBottom: "1px solid #ddd",
          fontWeight: "bold",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "6px 12px",
          borderBottom: "1px solid #ddd",
          wordBreak: "break-all",
        }}
      >
        {value}
      </td>
    </tr>
  );
}
