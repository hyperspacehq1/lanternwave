import { NextResponse } from "next/server";
import { query } from "@/lib/db";

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

  // SET LOCAL must be a real query string
  await query(
    `SET LOCAL app.tenant_id = $1`,
    [tenantId]
  );

  try {
    const result = await query(
      `
      SELECT value
      FROM debug_kv
      WHERE tenant_id = app_tenant_id()
        AND key = $1
      LIMIT 1
      `,
      [KV_KEY]
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
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "missing tenant context" },
      { status: 401 }
    );
  }

  // SET LOCAL must be a real query string
  await query(
    `SET LOCAL app.tenant_id = $1`,
    [tenantId]
  );

  try {
    const body = await req.json();
    const payload = {
      key: body.key || null,
      updatedAt: new Date().toISOString(),
    };

    await query(
      `
      INSERT INTO debug_kv (tenant_id, key, value)
      VALUES (
        app_tenant_id(),
        $1,
        $2
      )
      ON CONFLICT (tenant_id, key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
      `,
      [KV_KEY, payload]
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
