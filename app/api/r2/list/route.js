import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/server";

// 🚨 Ensure this never runs as a cached render artifact
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { tenantId } = getTenantContext({ allowAnonymous: true });

    // Initial render / unauthenticated — NOT an error
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
  } catch (err) {
    console.error("[list GET] real error", err);
    return NextResponse.json(
      { ok: false, error: "failed to list clips" },
      { status: 500 }
    );
  }
}
