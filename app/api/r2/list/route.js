import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "missing tenant context" },
      { status: 401 }
    );
  }

  // Enforce RLS
  await query(
    `SET LOCAL app.tenant_id = $1`,
    [tenantId]
  );

  try {
    const items = await query(
      `
      SELECT key, created_at
      FROM clips
      WHERE tenant_id = app_tenant_id()
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      `
    );

    return NextResponse.json({ ok: true, items: items.rows });
  } catch (err) {
    console.error("r2 list error:", err);
    return NextResponse.json(
      { ok: false, error: "list failed" },
      { status: 500 }
    );
  }
}
