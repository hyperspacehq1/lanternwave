import { NextResponse } from "next/server";
import { query } from "@/lib/db/db";

export async function POST() {
  try {
    // Connection usage
    const connections = await query(`
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN state = 'active' THEN 1 ELSE 0 END)::int AS active
      FROM pg_stat_activity
    `);

    // Database size
    const size = await query(`
      SELECT pg_database_size(current_database()) AS bytes
    `);

    const payload = {
      summary: {
        connections: connections.rows[0],
        database_size_bytes: size.rows[0].bytes,
      },
      checks: [
        {
          key: "connections",
          title: "Connection Usage",
          status: "green",
          metrics: connections.rows[0],
        },
        {
          key: "db_size",
          title: "Database Size",
          status: "green",
          metrics: { bytes: size.rows[0].bytes },
        },
      ],
    };

    await query(
      `
      INSERT INTO db_health_runs (payload, overall_status)
      VALUES ($1, $2)
      `,
      [payload, "green"]
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
