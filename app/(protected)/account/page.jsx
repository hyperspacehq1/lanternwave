"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/debug/account", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (!data?.ok || !data?.debug?.auth?.username) {
        throw new Error("Account data unavailable");
      }

      setUsername(data.debug.auth.username);
    } catch (err) {
      setError("Failed to load account");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={wrap}>
      <h1 style={title}>My Account</h1>

      {loading && <div>Loading…</div>}

      {error && <div style={errorStyle}>{error}</div>}

      {!loading && !error && (
        <div style={card}>
          <Row label="Username" value={username} />
          <Row label="Plan" value="Observer" />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={row}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

/* ---------------- styles ---------------- */

const wrap = {
  padding: 32,
  maxWidth: 520,
};

const title = {
  marginBottom: 24,
};

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 20,
  background: "#fff",
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid #f1f5f9",
};

const labelStyle = {
  color: "#475569",
};

const valueStyle = {
  fontWeight: 600,
};

const errorStyle = {
  color: "#b91c1c",
};
