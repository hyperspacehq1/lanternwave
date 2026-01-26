// /app/api/admin/db-health/run/route.js
import { NextResponse } from "next/server";

/**
 * Replace this with your existing DB helper.
 * Example patterns:
 *  - import { pool } from "@/lib/db";
 *  - import { query } from "@/lib/db";
 */
async function getDb() {
  // TODO: wire to your existing Postgres pool/query helper
  // return pool;
  throw new Error("TODO: Wire getDb() to your Postgres helper.");
}

function clampStatus(statuses) {
  // overall: red > yellow > green
  if (statuses.includes("red")) return "red";
  if (statuses.includes("yellow")) return "yellow";
  return "green";
}

function statusFor(value, { green, yellow, red, higherIsWorse = true }) {
  // thresholds are numbers; define green upper/lower etc via simple rules
  // Example usage: higherIsWorse: value >= red => red, >= yellow => yellow else green
  if (higherIsWorse) {
    if (value >= red) return "red";
    if (value >= yellow) return "yellow";
    return "green";
  } else {
    // lowerIsWorse: value <= red => red, <= yellow => yellow else green
    if (value <= red) return "red";
    if (value <= yellow) return "yellow";
    return "green";
  }
}

function safeNumber(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

async function tryQuery(db, text, params = []) {
  try {
    const res = await db.query(text, params);
    return { ok: true, rows: res.rows || [] };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

function nowISO() {
  return new Date().toISOString();
}

export async function POST(req) {
  try {
    // Optional: protect this route for cron calls
    // const auth = req.headers.get("authorization");
    // if (auth !== `Bearer ${process.env.DB_HEALTH_CRON_TOKEN}`) {
    //   return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    // }

    const db = await getDb();

    // ---------------------------
    // 0) basic server metrics
    // ---------------------------
    const serverInfoQ = await tryQuery(
      db,
      `
      select
        current_database() as db_name,
        version() as version,
        (select setting::int from pg_settings where name='max_connections') as max_connections
      `
    );

    const maxConnections = safeNumber(serverInfoQ.ok ? serverInfoQ.rows?.[0]?.max_connections : 0, 0);

    // ---------------------------
    // 1) connection usage & saturation (and #12 near max_connections)
    // ---------------------------
    const connStateQ = await tryQuery(
      db,
      `
      select state, count(*)::int as count
      from pg_stat_activity
      where pid <> pg_backend_pid()
      group by state
      `
    );

    const connTotalQ = await tryQuery(
      db,
      `
      select count(*)::int as total
      from pg_stat_activity
      where pid <> pg_backend_pid()
      `
    );

    const idleInTxQ = await tryQuery(
      db,
      `
      select count(*)::int as idle_in_tx
      from pg_stat_activity
      where state = 'idle in transaction'
        and pid <> pg_backend_pid()
      `
    );

    const connectionsTotal = safeNumber(connTotalQ.ok ? connTotalQ.rows?.[0]?.total : 0, 0);
    const idleInTx = safeNumber(idleInTxQ.ok ? idleInTxQ.rows?.[0]?.idle_in_tx : 0, 0);

    const connPct = maxConnections > 0 ? (connectionsTotal / maxConnections) * 100 : 0;

    // status thresholds
    const connectionUsageStatus = statusFor(connPct, { yellow: 70, red: 85, green: 0, higherIsWorse: true });
    const nearMaxConnectionsStatus = statusFor(connPct, { yellow: 80, red: 90, green: 0, higherIsWorse: true });
    const idleInTxStatus = statusFor(idleInTx, { yellow: 1, red: 5, green: 0, higherIsWorse: true });

    // ---------------------------
    // 2) red flags (short list)
    // ---------------------------
    // Red flags we’ll treat as:
    // - any idle-in-transaction
    // - any blocked queries waiting on locks
    // - very old vacuum / high dead tuples on top tables (covered below but summarized here)
    const waitingQ = await tryQuery(
      db,
      `
      select count(*)::int as waiting
      from pg_stat_activity
      where wait_event is not null
        and pid <> pg_backend_pid()
      `
    );
    const waitingCount = safeNumber(waitingQ.ok ? waitingQ.rows?.[0]?.waiting : 0, 0);
    const waitingStatus = statusFor(waitingCount, { yellow: 1, red: 5, green: 0, higherIsWorse: true });

    const redFlagsStatus = clampStatus([idleInTxStatus, waitingStatus, nearMaxConnectionsStatus]);

    // ---------------------------
    // 3) autovacuum effectiveness
    // ---------------------------
    const deadTuplesQ = await tryQuery(
      db,
      `
      select
        relname,
        n_dead_tup::bigint as dead,
        n_live_tup::bigint as live,
        last_autovacuum,
        last_vacuum
      from pg_stat_user_tables
      order by n_dead_tup desc
      limit 10
      `
    );

    // use ratio dead/live for top table as quick signal
    let worstDeadRatio = 0;
    if (deadTuplesQ.ok && deadTuplesQ.rows.length) {
      for (const r of deadTuplesQ.rows) {
        const dead = safeNumber(r.dead, 0);
        const live = Math.max(safeNumber(r.live, 0), 1);
        const ratio = dead / live;
        if (ratio > worstDeadRatio) worstDeadRatio = ratio;
      }
    }
    const autovacStatus = statusFor(worstDeadRatio, { yellow: 0.2, red: 0.5, green: 0, higherIsWorse: true });

    // ---------------------------
    // 4) index usage & missing indexes (seq_scan heavy)
    // ---------------------------
    const scansQ = await tryQuery(
      db,
      `
      select relname, seq_scan::bigint as seq_scan, idx_scan::bigint as idx_scan
      from pg_stat_user_tables
      order by seq_scan desc
      limit 10
      `
    );

    // heuristic: if top table has huge seq_scan and low idx_scan, warn
    let worstSeqScan = 0;
    let worstIdxScan = 0;
    if (scansQ.ok && scansQ.rows.length) {
      worstSeqScan = safeNumber(scansQ.rows[0].seq_scan, 0);
      worstIdxScan = safeNumber(scansQ.rows[0].idx_scan, 0);
    }
    const seqScanSignal = worstSeqScan > 0 ? worstSeqScan / Math.max(worstIdxScan, 1) : 0;
    const indexUsageStatus = statusFor(seqScanSignal, { yellow: 10, red: 50, green: 0, higherIsWorse: true });

    // ---------------------------
    // 5) leaks (long-lived sessions / idle clients)
    // ---------------------------
    const longIdleQ = await tryQuery(
      db,
      `
      select count(*)::int as long_idle
      from pg_stat_activity
      where state = 'idle'
        and now() - state_change > interval '1 hour'
        and pid <> pg_backend_pid()
      `
    );
    const longIdle = safeNumber(longIdleQ.ok ? longIdleQ.rows?.[0]?.long_idle : 0, 0);
    const leaksStatus = statusFor(longIdle, { yellow: 10, red: 50, green: 0, higherIsWorse: true });

    // ---------------------------
    // 6) table & index bloat (approx via size vs rows signals)
    // ---------------------------
    // true bloat requires extensions; we’ll use practical approximation:
    // biggest relations + dead tuple ratio already counted; also flag very large indexes
    const largestRelationsQ = await tryQuery(
      db,
      `
      select
        relname,
        pg_total_relation_size(relid)::bigint as total_bytes,
        pg_relation_size(relid)::bigint as table_bytes,
        (pg_total_relation_size(relid) - pg_relation_size(relid))::bigint as index_bytes
      from pg_catalog.pg_statio_user_tables
      order by pg_total_relation_size(relid) desc
      limit 10
      `
    );

    let worstIndexShare = 0;
    if (largestRelationsQ.ok && largestRelationsQ.rows.length) {
      for (const r of largestRelationsQ.rows) {
        const total = Math.max(safeNumber(r.total_bytes, 0), 1);
        const index = safeNumber(r.index_bytes, 0);
        const share = index / total;
        if (share > worstIndexShare) worstIndexShare = share;
      }
    }
    const bloatStatus = statusFor(worstIndexShare, { yellow: 0.6, red: 0.8, green: 0, higherIsWorse: true });

    // ---------------------------
    // 7) slow queries (pg_stat_statements if available)
    // ---------------------------
    const slowQ = await tryQuery(
      db,
      `
      select query, total_exec_time, mean_exec_time, calls
      from pg_stat_statements
      order by total_exec_time desc
      limit 10
      `
    );

    // if extension not available, mark yellow with message
    let slowQueriesStatus = "green";
    let slowQueriesNote = null;
    let worstMeanMs = 0;

    if (!slowQ.ok) {
      slowQueriesStatus = "yellow";
      slowQueriesNote = "pg_stat_statements not available (enable extension for slow query visibility).";
    } else {
      if (slowQ.rows.length) {
        for (const r of slowQ.rows) {
          const mean = safeNumber(r.mean_exec_time, 0);
          if (mean > worstMeanMs) worstMeanMs = mean;
        }
      }
      slowQueriesStatus = statusFor(worstMeanMs, { yellow: 250, red: 1000, green: 0, higherIsWorse: true });
    }

    // ---------------------------
    // 8) locks & blocking
    // ---------------------------
    const blockedQ = await tryQuery(
      db,
      `
      select count(*)::int as blocked
      from pg_stat_activity
      where wait_event_type = 'Lock'
        and pid <> pg_backend_pid()
      `
    );
    const blocked = safeNumber(blockedQ.ok ? blockedQ.rows?.[0]?.blocked : 0, 0);
    const locksStatus = statusFor(blocked, { yellow: 1, red: 5, green: 0, higherIsWorse: true });

    // ---------------------------
    // 9) total db size
    // ---------------------------
    const dbSizeQ = await tryQuery(db, `select pg_database_size(current_database())::bigint as bytes`);
    const dbBytes = safeNumber(dbSizeQ.ok ? dbSizeQ.rows?.[0]?.bytes : 0, 0);
    // status is informational unless you define budget; use thresholds as example:
    const dbSizeGb = dbBytes / (1024 ** 3);
    const dbSizeStatus = statusFor(dbSizeGb, { yellow: 50, red: 200, green: 0, higherIsWorse: true });

    // ---------------------------
    // 10) largest tables & indexes (already fetched)
    // ---------------------------
    const largestStatus = "green"; // informational; bloat check covers “badness”

    // ---------------------------
    // 11) checkpoint & bgwriter pressure
    // ---------------------------
    const bgwriterQ = await tryQuery(db, `select * from pg_stat_bgwriter`);
    let checkpointStatus = "green";
    let buffersCheckpoint = 0;
    let checkpointsReq = 0;

    if (bgwriterQ.ok && bgwriterQ.rows.length) {
      const r = bgwriterQ.rows[0];
      buffersCheckpoint = safeNumber(r.buffers_checkpoint, 0);
      checkpointsReq = safeNumber(r.checkpoints_req, 0);

      // heuristic: lots of requested checkpoints indicates pressure
      checkpointStatus = statusFor(checkpointsReq, { yellow: 50, red: 200, green: 0, higherIsWorse: true });
    } else {
      checkpointStatus = "yellow";
    }

    // ---------------------------
    // Compose payload
    // ---------------------------
    const checks = [
      {
        key: "connection_usage",
        title: "Connection Usage & Saturation",
        status: connectionUsageStatus,
        metrics: { connectionsTotal, maxConnections, connPct: Number(connPct.toFixed(2)) },
      },
      {
        key: "red_flags",
        title: "Red Flags",
        status: redFlagsStatus,
        metrics: { idleInTx, waitingCount, connPct: Number(connPct.toFixed(2)) },
      },
      {
        key: "autovacuum",
        title: "Autovacuum Effectiveness",
        status: autovacStatus,
        metrics: { worstDeadRatio: Number(worstDeadRatio.toFixed(3)) },
        topTables: deadTuplesQ.ok ? deadTuplesQ.rows : [],
      },
      {
        key: "index_usage",
        title: "Index Usage & Missing Indexes",
        status: indexUsageStatus,
        metrics: { seqScanSignal: Number(seqScanSignal.toFixed(2)), worstSeqScan, worstIdxScan },
        topTables: scansQ.ok ? scansQ.rows : [],
      },
      {
        key: "leaks",
        title: "Leaks (Long-idle Connections)",
        status: leaksStatus,
        metrics: { longIdleOver1h: longIdle },
      },
      {
        key: "bloat",
        title: "Table & Index Bloat (Approx.)",
        status: bloatStatus,
        metrics: { worstIndexShare: Number(worstIndexShare.toFixed(2)) },
      },
      {
        key: "slow_queries",
        title: "Slow Queries",
        status: slowQueriesStatus,
        note: slowQueriesNote,
        metrics: { worstMeanMs: Number(worstMeanMs.toFixed(1)) },
        topQueries: slowQ.ok ? slowQ.rows : [],
      },
      {
        key: "locks",
        title: "Locks & Blocking Queries",
        status: locksStatus,
        metrics: { blocked },
      },
      {
        key: "db_size",
        title: "Total DB Size",
        status: dbSizeStatus,
        metrics: { dbBytes, dbSizeGb: Number(dbSizeGb.toFixed(2)) },
      },
      {
        key: "largest",
        title: "Largest Tables & Indexes",
        status: largestStatus,
        topRelations: largestRelationsQ.ok ? largestRelationsQ.rows : [],
      },
      {
        key: "checkpoint",
        title: "Checkpoint & Background Writer Pressure",
        status: checkpointStatus,
        metrics: { checkpointsReq, buffersCheckpoint },
      },
      {
        key: "near_max_connections",
        title: "Connection Count Near max_connections",
        status: nearMaxConnectionsStatus,
        metrics: { connPct: Number(connPct.toFixed(2)), connectionsTotal, maxConnections },
      },
    ];

    const overallStatus = clampStatus(checks.map((c) => c.status));

    const payload = {
      generated_at: nowISO(),
      server: serverInfoQ.ok ? serverInfoQ.rows?.[0] : null,
      checks,
      debug: {
        queryErrors: {
          serverInfo: serverInfoQ.ok ? null : serverInfoQ.error,
          connState: connStateQ.ok ? null : connStateQ.error,
          slowQueries: slowQ.ok ? null : slowQ.error,
        },
      },
    };

    // ---------------------------
    // Store run + enforce 7-day retention
    // ---------------------------
    const insertQ = await tryQuery(
      db,
      `
      insert into db_health_runs (overall_status, payload)
      values ($1, $2::jsonb)
      returning id, created_at
      `,
      [overallStatus, JSON.stringify(payload)]
    );

    // Delete older than 7 days
    await tryQuery(
      db,
      `
      delete from db_health_runs
      where created_at < now() - interval '7 days'
      `
    );

    return NextResponse.json({
      ok: true,
      id: insertQ.ok ? insertQ.rows?.[0]?.id : null,
      created_at: insertQ.ok ? insertQ.rows?.[0]?.created_at : null,
      overall_status: overallStatus,
      payload,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
