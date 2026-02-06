import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { key, value } = body || {};

  if (!key || value === undefined) {
    return NextResponse.json(
      { ok: false, error: "key and value required" },
      { status: 400 }
    );
  }

  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!ctx?.tenantId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await query(
      `
      UPDATE account_preferences
         SET audio =
           jsonb_set(
             COALESCE(audio, '{}'::jsonb),
             ARRAY[$1]::text[],
             $2::jsonb,
             true
           ),
             updated_at = NOW()
       WHERE tenant_id = $3
       RETURNING tenant_id, audio
      `,
      [key, JSON.stringify(value), ctx.tenantId]
    );

    return NextResponse.json({ ok: true, audio: result.rows[0]?.audio ?? {} });
  } catch (err) {
    console.error("[account-audio] PUT ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update audio preferences" },
      { status: 500 }
    );
  }
}