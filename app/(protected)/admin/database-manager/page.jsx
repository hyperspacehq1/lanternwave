"use client";

import { useEffect, useState } from "react";

function Badge({ status }) {
  const cls =
    status === "green"
      ? "bg-green-600/20 text-green-300 border-green-700"
      : status === "yellow"
      ? "bg-yellow-600/20 text-yellow-200 border-yellow-700"
      : "bg-red-600/20 text-red-200 border-red-700";

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs border rounded ${cls}`}>
      {status.toUpperCase()}
    </span>
  );
}

function Card({ title, status, subtitle, children }) {
  const border =
    status === "green"
      ? "border-green-800"
      : status === "yellow"
      ? "border-yellow-800"
      : "border-red-800";

  return (
    <div className={`rounded-xl border ${border} bg-black/30 p-4 shadow`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? (
            <div className="text-xs text-white/60 mt-1">{subtitle}</div>
          ) : null}
        </div>
        <Badge status={status} />
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export default function DatabaseManagerPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const latest = runs[0] || null;

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/db-health/history", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) setRuns(data.runs || []);
    } finally {
      setLoading(false);
    }
  }

  async function runNow() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/db-health/run", {
        method: "POST",
      });
      const data = await res.json();
      if (!data?.ok) {
        alert(data?.error || "Health check failed");
      }
      await loadHistory();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Database Manager</h1>
          <div className="text-sm text-white/60 mt-1">
            Manual database health checks (last 7 days)
          </div>
        </div>

        <button
          type="button"
          className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
          onClick={runNow}
          disabled={loading}
        >
          {loading ? "Running…" : "Run Health Check"}
        </button>
      </div>

      {/* Latest summary */}
      {latest ? (
        <Card
          title="Latest Run"
          status={latest.overall_status}
          subtitle={new Date(latest.created_at).toLocaleString()}
        >
          <pre className="text-xs whitespace-pre-wrap text-white/70">
            {JSON.stringify(latest.payload?.summary || {}, null, 2)}
          </pre>
        </Card>
      ) : (
        <div className="text-sm text-white/60">
          No health checks have been run yet.
        </div>
      )}

      {/* Individual checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {latest?.payload?.checks?.map((check) => (
          <Card
            key={check.key}
            title={check.title}
            status={check.status}
            subtitle={check.note || null}
          >
            <pre className="text-xs whitespace-pre-wrap text-white/70">
              {JSON.stringify(check.metrics || {}, null, 2)}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
