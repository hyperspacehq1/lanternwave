import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/server";

export const runtime = "nodejs";

export async function GET() {
  const { tenantId } = getTenantContext({ allowAnonymous: true });

console.log("LIST tenantId =", tenantId);

// If no tenant yet (initial load / pre-auth), return empty list
  if (!tenantId) {
    return NextResponse.json({ ok: true, rows: [] });
  }

  const result = await query(
    `
    select
      id,
      title,
      object_key,
      mime_type,
      byte_size,
      duration_ms,
      created_at
    from clips
    where tenant_id = $1
      and deleted_at is null
    order by created_at desc
    `,
    [tenantId]
  );

  return NextResponse.json({
    ok: true,
    rows: result.rows,
  });
}
