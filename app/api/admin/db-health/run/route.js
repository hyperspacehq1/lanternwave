import { NextResponse } from "next/server";
import { query } from "@/lib/db/db";
import { statusFromRatio, statusFromBytes } from "@/lib/db/healthThresholds";

export async function POST() {
  try {
    /* ---------- Connection usage ---------- */
    const connections = await query(`
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN state = 'active' THEN 1 ELSE 0 END)::int AS active
      FROM pg_stat_activity
    `);

    const conn = connections.rows[0];
    const connRatio = conn.active / Math.max(conn.total, 1);
    const connStatus = statusFromRatio(connRatio, 0.6, 0.85);

    /* ---------- DB size ---------- */
    const size = await query(`
      SELECT pg_database_size(current_database()) AS bytes
    `);

    const bytes = Number(size.rows[0].bytes);
    const sizeStatus = statusFromBytes(
      bytes,
      50 * 1024 * 1024 * 1024,
      100 * 1024 * 1024 * 1024
    );

    /* ---------- Blocking queries ---------- */
    const blocking = await query(`
      SELECT
        blocked.pid,
        blocker.pid AS blocker_pid,
        now() - blocked.query_start AS blocked_for,
        blocked.query,
        blocker.query AS blocker_query
      FROM pg_locks blocked_locks
      JOIN pg_stat_activity blocked ON blocked.pid = blocked_locks.pid
      JOIN pg_locks blocker_locks
        ON blocker_locks.locktype = blocked_locks.locktype
       AND blocker_locks.database IS NOT DISTINCT FROM blocked_locks.database
       AND blocker_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
       AND blocker_locks.pid != blocked_locks.pid
      JOIN pg_stat_activity blocker ON blocker.pid = blocker_locks.pid
      WHERE NOT blocked_locks.granted
    `);

    let blockingStatus = "green";
    if (blocking.rows.length > 0) {
      const longestMs = Math.max(
        ...blocking.rows.map(
          r => new Date(`1970-01-01T${r.blocked_for}`).getTime()
        )
      );
      blockingStatus = longestMs >= 30_000 ? "red" : "yellow";
    }

    /* ---------- Idle connection leaks ---------- */
    const idle = await query(`
      SELECT
        pid,
        usename,
        application_name,
        client_addr,
        now() - state_change AS idle_for,
        query
      FROM pg_stat_activity
      WHERE state = 'idle'
        AND now() - state_change > interval '5 minutes'
        AND pid <> pg_backend_pid()
    `);

    let idleStatus = "green";
    if (idle.rows.length > 0) {
      const longestMs = Math.max(
        ...idle.rows.map(
          r => new Date(`1970-01-01T${r.idle_for}`).getTime()
        )
      );
      idleStatus = longestMs >= 30 * 60_000 ? "red" : "yellow";
    }

    /* ---------- Autovacuum lag / dead tuples ---------- */
    const vacuum = await query(`
      SELECT
        relname,
        n_dead_tup,
        last_autovacuum,
        now() - last_autovacuum AS vacuum_age
      FROM pg_stat_user_tables
      ORDER BY n_dead_tup DESC
      LIMIT 10
    `);

    let vacuumStatus = "green";

    if (vacuum.rows.length > 0) {
      const worstDead = Math.max(...vacuum.rows.map(r => r.n_dead_tup || 0));
      const oldestVacuumMs = Math.max(
        ...vacuum.rows
          .filter(r => r.vacuum_age)
          .map(r => new Date(`1970-01-01T${r.vacuum_age}`).getTime())
      );

      if (worstDead >= 1_000_000 || oldestVacuumMs >= 7 * 24 * 60 * 60_000) {
        vacuumStatus = "red";
      } else if (
        worstDead >= 100_000 ||
        oldestVacuumMs >= 24 * 60 * 60_000
      ) {
        vacuumStatus = "yellow";
      }
    }

    /* ---------- Assemble checks ---------- */
    const checks = [
      {
        key: "connections",
        title: "Connection Usage",
        status: connStatus,
        metrics: conn,
      },
      {
        key: "db_size",
        title: "Database Size",
        status: sizeStatus,
        metrics: { bytes },
      },
      {
        key: "blocking_queries",
        title: "Blocking Queries",
        status: blockingStatus,
        metrics: blocking.rows,
      },
      {
        key: "idle_connections",
        title: "Idle Connection Leaks",
        status: idleStatus,
        metrics: idle.rows,
      },
      {
        key: "autovacuum",
        title: "Autovacuum Lag / Dead Tuples",
        status: vacuumStatus,
        metrics: vacuum.rows.map(r => ({
          table: r.relname,
          dead_tuples: r.n_dead_tup,
          last_autovacuum: r.last_autovacuum,
          vacuum_age: r.vacuum_age,
        })),
      },
    ];

    const overall =
      checks.some(c => c.status === "red")
        ? "red"
        : checks.some(c => c.status === "yellow")
        ? "yellow"
        : "green";

    const payload = { summary: { overall }, checks };

    await query(
      `
      INSERT INTO db_health_runs (payload, overall_status)
      VALUES ($1, $2)
      `,
      [payload, overall]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DB health run failed:", err);
    return NextResponse.json(
      { ok: false, error: "DB health check failed" },
      { status: 500 }
    );
  }
}
