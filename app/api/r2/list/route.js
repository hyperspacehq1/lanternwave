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

  await query()SET LOCAL app.tenant_id = ${tenantId});

  try {
    const items = await query()
      SELECT
        key,
        byte_size AS size,
        created_at AS "lastModified"
      FROM clips
      WHERE tenant_id = app_tenant_id()
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    );

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("list-clips error:", err);
    return NextResponse.json(
      { ok: false, error: "failed to list clips" },
      { status: 500 }
    );
  }
}
