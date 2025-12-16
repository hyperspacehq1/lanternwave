import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/server";

export const runtime = "nodejs";

const KV_KEY = "now_playing";

// ------------------------------------------------------------
// GET now playing
// ------------------------------------------------------------
export async function GET() {
  try {
    // ----------------------------------------------------------
    // Resolve tenant from cookies (Option A)
    // ----------------------------------------------------------
    const { tenantId } = getTenantContext();

    const result = await query(
      `
      SELECT value
      FROM debug_kv
      WHERE tenant_id = $1
        AND key = $2
      LIMIT 1
      `,
      [tenantId, KV_KEY]
    );

    return NextResponse.json({
      ok: true,
      nowPlaying: result.rows[0]?.value || null,
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
  try {
    // ----------------------------------------------------------
    // Resolve tenant from cookies (Option A)
    // ----------------------------------------------------------
    const { tenantId } = getTenantContext();

    const body = await req.json();
    const payload = {
      key: body.key || null,
      updatedAt: new Date().toISOString(),
    };

    await query(
      `
      INSERT INTO debug_kv (tenant_id, key, value)
      VALUES ($1, $2, $3)
      ON CONFLICT (tenant_id, key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
      `,
      [tenantId, KV_KEY, payload]
    );

    return NextResponse.json({
      ok: true,
      nowPlaying: payload,
    });
  } catch (err) {
    console.error("now-playing POST error:", err);
    return NextResponse.json(
      { ok: false, error: "failed to set now playing" },
      { status: 500 }
    );
  }
}
