import { NextResponse } from "next/server";
import { query } from "@/lib/db/db";

export async function GET() {
  const { rows } = await query(`
    SELECT id, payload, overall_status, created_at
    FROM db_health_runs
    ORDER BY created_at DESC
    LIMIT 7
  `);

  return NextResponse.json({
    ok: true,
    runs: rows,
  });
}
