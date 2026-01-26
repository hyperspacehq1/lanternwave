// /app/(protected)/admin/database-manager/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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
          {subtitle ? <div className="text-xs text-white/60 mt-1">{subtitle}</div> : null}
        </div>
        <Badge status={status} />
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

function getCheck(run, key) {
  const checks = run?.payload?.checks || [];
  return checks.find((c) => c.key === key) || null;
}

export default function DatabaseManagerPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const latest = runs?.[0] || null;

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/db-health/history", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok) setRuns(data.runs || []);
    } finally {
      setLoading(false);
    }
  }

  async function runNow() {
    // optional manual trigger button for admins
    const res = await fetch("/api/admin/db-health/run", { method: "POST" });
    const data = await res.json();
    if (data?.ok) await load();
    else alert(data?.error || "Run failed");
  }

  useEffect(() => {
    load();
  }, []);

  const checkCards = useMemo(() => {
    const checks = latest?.payload?.checks || [];
    return checks;
  }, [latest]);

  const trendData = useMemo(() => {
    // reverse to chart oldest->newest
    const arr = [...runs].reverse();
    return arr.map((r) => {
      const cConn = getCheck(r, "connection_usage");
      const cSize = getCheck(r, "db_size");
      const cLocks = getCheck(r, "locks");
      const cSlow = getCheck(r, "slow_queries");
      const cVac = getCheck(r, "autovacuum");
      const cChk = getCheck(r, "checkpoint");

      return {
        date: fmtDate(r.created_at),
        connPct: cConn?.metrics?.connPct ?? null,
        dbSizeGb: cSize?.metrics?.dbSizeGb ?? null,
        blocked: cLocks?.metrics?.blocked ?? null,
        worstMeanMs: cSlow?.metrics?.worstMeanMs ?? null,
        deadRatio: cVac?.metrics?.worstDeadRatio ?? null,
        checkpointsReq: cChk?.metrics?.checkpointsReq ?? null,
      };
    });
  }, [runs]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Database Manager</h1>
          <div className="text-sm text-white/60 mt-1">
            Daily health snapshot (stored for 7 days)
          </div>
        </div>

        <div className="flex items-center gap-3">
          {latest ? (
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/60">Latest:</div>
              <div className="text-xs">{new Date(latest.created_at).toLocaleString()}</div>
              <Badge status={latest.overall_status} />
            </div>
          ) : null}

          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
            onClick={runNow}
            disabled={loading}
            title="Manual run"
          >
            Run Now
          </button>
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="text-sm text-white/60">Loading…</div>
        ) : checkCards.length ? (
          checkCards.map((c) => (
            <Card
              key={c.key}
              title={c.title}
              status={c.status}
              subtitle={c.note || null}
            >
              <pre className="text-xs whitespace-pre-wrap text-white/70">
                {JSON.stringify(c.metrics || {}, null, 2)}
              </pre>
            </Card>
          ))
        ) : (
          <div className="text-sm text-white/60">
            No runs yet. Click “Run Now” or wait for the nightly job.
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Connection % Trend (7 days)" status={latest?.overall_status || "green"}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="connPct" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="DB Size (GB) Trend (7 days)" status={latest?.overall_status || "green"}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="dbSizeGb" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Blocked Queries Trend" status={latest?.overall_status || "green"}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="blocked" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Worst Slow Query Mean (ms)" status={latest?.overall_status || "green"}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="worstMeanMs" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Autovac Dead Tuple Ratio (Worst)" status={latest?.overall_status || "green"}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="deadRatio" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Checkpoint Pressure (checkpoints_req)" status={latest?.overall_status || "green"}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="checkpointsReq" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
