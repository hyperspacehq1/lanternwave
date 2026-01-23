import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET — fetch account audio preferences
============================================================ */
export async function GET(req) {
  try {
    const ctx = await getTenantContext(req);
    if (!ctx?.tenantId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const { rows } = await query(
      `
      SELECT audio
        FROM account_preferences
       WHERE tenant_id = $1
       LIMIT 1
      `,
      [ctx.tenantId]
    );

    return NextResponse.json({
      ok: true,
      audio: rows[0]?.audio ?? { player_enabled: false },
    });
  } catch (err) {
    console.error("[account-audio][GET] UNCAUGHT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   PUT — update account audio preferences
============================================================ */
export async function PUT(req) {
  try {
    const body = await req.json();
    const { key, value } = body || {};

    if (typeof key !== "string") {
      return NextResponse.json(
        { ok: false, error: "invalid key" },
        { status: 400 }
      );
    }

    const ALLOWED_KEYS = ["player_enabled"];
    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        { ok: false, error: "unsupported audio setting" },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(req);
    if (!ctx?.tenantId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    await query(
      `
      UPDATE account_preferences
         SET audio =
           COALESCE(audio, '{}'::jsonb)
           || jsonb_build_object($1, $2),
             updated_at = NOW()
       WHERE tenant_id = $3
      `,
      [key, !!value, ctx.tenantId]
    );

    return NextResponse.json({
      ok: true,
      audio: { [key]: !!value },
    });
  } catch (err) {
    console.error("[account-audio][PUT] UNCAUGHT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal server error" },
      { status: 500 }
    );
  }
}