import { debugApi } from "@/lib/debug/api";

export async function GET(req) {
  debugApi("r2/list", req);

  try {
    const { tenantId } = getTenantContext();

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    // ------------------------------------------------------------
    // Resolve tenant from cookies
    // ------------------------------------------------------------
    const { tenantId } = getTenantContext();

    if (!tenantId) {
      throw new Error("Tenant context missing");
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
