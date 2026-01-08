import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (err) {
    console.error("[r2/list] auth error", err);
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const tenantId = ctx.tenantId;

  if (!tenantId) {
    console.error("[r2/list] tenantId missing", ctx);
    return NextResponse.json(
      { ok: false, error: "Tenant not resolved" },
      { status: 500 }
    );
  }

  const result = await query(
    `
    SELECT
      id,
      title,
      object_key,
      mime_type,
      byte_size,
      duration_ms,
      created_at
    FROM clips
    WHERE tenant_id = $1
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    `,
    [tenantId]
  );

  return NextResponse.json({
    ok: true,
    rows: result.rows,
  });
}
