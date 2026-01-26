import { NextResponse } from "next/server";
import { query } from "@/lib/db/db";
import { statusFromRatio, statusFromBytes } from "@/lib/db/healthThresholds";

export async function POST() {
  try {
    // Connections
    const connections = await query(`
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN state = 'active' THEN 1 ELSE 0 END)::int AS active
      FROM pg_stat_activity
    `);

    const conn = connections.rows[0];
    const connRatio = conn.active / Math.max(conn.total, 1);

    const connStatus = statusFromRatio(
      connRatio,
      0.6,  // yellow
      0.85  // red
    );

    // DB size
    const size = await query(`
      SELECT pg_database_size(current_database()) AS bytes
    `);

    const bytes = Number(size.rows[0].bytes);

    const sizeStatus = statusFromBytes(
      bytes,
      50 * 1024 * 1024 * 1024,   // 50GB = yellow
      100 * 1024 * 1024 * 1024  // 100GB = red
    );

    const checks = [
      {
        key: "connections",
        title: "Connection Usage",
        status: connStatus,
        note: `${conn.active} active / ${conn.total} total`,
        metrics: {
          active: conn.active,
          total: conn.total,
          ratio: Number(connRatio.toFixed(2)),
        },
      },
      {
        key: "db_size",
        title: "Database Size",
        status: sizeStatus,
        metrics: { bytes },
      },
    ];

    const overall =
      checks.some(c => c.status === "red")
        ? "red"
        : checks.some(c => c.status === "yellow")
        ? "yellow"
        : "green";

    const payload = {
      summary: { overall },
      checks,
    };

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
