import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const KV_KEY = "now_playing";

// ------------------------------------------------------------
// GET now playing
// ------------------------------------------------------------
export async function GET(req) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "missing tenant context" },
      { status: 401 }
    );
  }

  await sql`SET LOCAL app.tenant_id = ${tenantId}`;

  try {
    const [row] = await sql`
      SELECT value
      FROM debug_kv
      WHERE tenant_id = app_tenant_id()
        AND key = ${KV_KEY}
      LIMIT 1
    `;

    return NextResponse.json({
      ok: true,
      nowPlaying: row?.value || null,
    });
  } catch (err) {
    console.error("now-playing GET error:", err);
    return NextResponse.json(
      { ok: false, error: "failed to read now playing" },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// SET now playing
// ------------------------------------------------------------
export async function POST(req) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "missing tenant context" },
      { status: 401 }
    );
  }

  await sql`SET LOCAL app.tenant_id = ${tenantId}`;

  try {
    const body = await req.json();
    const payload = {
      key: body.key || null,
      updatedAt: new Date().toISOString(),
    };

    await sql`
      INSERT INTO debug_kv (tenant_id, key, value)
      VALUES (
        app_tenant_id(),
        ${KV_KEY},
        ${payload}
      )
      ON CONFLICT (tenant_id, key)
