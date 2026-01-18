import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   GET /api/r2/usage
   Read-only storage usage for current tenant
-------------------------------------------------- */
export async function GET(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const tenantId = ctx.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Same source of truth as upload-url
    const db = ctx?.tenant?.db;

    const result = db
      ? await db.query(
          `SELECT COALESCE(SUM(byte_size), 0) AS used FROM clips WHERE tenant_id = $1`,
          [tenantId]
        )
      : await query(
          `SELECT COALESCE(SUM(byte_size), 0) AS used FROM clips WHERE tenant_id = $1`,
          [tenantId]
        );

    const usedBytes = Number(result.rows[0]?.used || 0);

    return NextResponse.json({
      ok: true,
      usedBytes,
    });
  } catch (err) {
    console.error("[r2 usage] error", err);
    return NextResponse.json(
      { ok: false, error: "failed_to_load_usage" },
      { status: 500 }
    );
  }
}
