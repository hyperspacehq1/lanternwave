import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/server";
import { query } from "@/lib/db";
import { debugApi } from "@/lib/debug/api";

export const runtime = "nodejs";

export async function GET(req) {
  // ------------------------------------------------------------
  // DEBUG (safe in prod)
  // ------------------------------------------------------------
  debugApi("r2/list", req);

  try {
    // ------------------------------------------------------------
    // Resolve tenant from cookies
    // ------------------------------------------------------------
    const { tenantId } = getTenantContext({ allowAnonymous: true });

    // IMPORTANT (2025 / RSC-safe):
    // If tenant is not ready during RSC prefetch, return empty list
    if (!tenantId) {
      return NextResponse.json({
        ok: true,
        tenant: null,
        items: [],
      });
    }

    // ------------------------------------------------------------
    // DB-first clip listing (source of truth)
    // ------------------------------------------------------------
    const { rows } = await query(
      `
      select
        object_key as key,
        byte_size as size,
        created_at as "lastModified"
      from clips
      where tenant_id = $1
        and deleted_at is null
      order by created_at desc
      `,
      [tenantId]
    );

    return NextResponse.json({
      ok: true,
      tenant: tenantId,
      items: rows,
    });
  } catch (err) {
    console.error("[r2 list]", err);
    return NextResponse.json(
      { ok: false, error: "list failed" },
      { status: 500 }
    );
  }
}
