import { NextResponse } from "next/server";
import { query, sql } from "@/lib/db";

export async function GET() {
  try {
    // Get table names
    const tablesResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    // In Neon 2025, this is already an array of rows
    const tables = Array.isArray(tablesResult)
      ? tablesResult
      : (tablesResult.rows ?? []);

    const counts = {};

    for (const t of tables) {
      const table = t.table_name;

      const countResult = await sql.query(
        `SELECT COUNT(*)::int AS count FROM ${table}`
      );

      counts[table] = countResult.rows?.[0]?.count ?? 0;
    }

    return NextResponse.json({
      tables,
      counts
    });

  } catch (err) {
    console.error("debug-db error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
