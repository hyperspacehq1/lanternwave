// /app/api/admin/db-health/history/route.js
import { NextResponse } from "next/server";

async function getDb() {
  // TODO: wire to your existing Postgres helper
  throw new Error("TODO: Wire getDb() to your Postgres helper.");
}

export async function GET() {
  try {
    const db = await getDb();
    const res = await db.query(
      `
      select id, created_at, overall_status, payload
      from db_health_runs
      order by created_at desc
      limit 7
      `
    );

    return NextResponse.json({ ok: true, runs: res.rows || [] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
