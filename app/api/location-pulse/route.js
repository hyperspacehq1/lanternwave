import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * LOCATION PULSE RESOLVER
 * ----------------------
 * GET /api/location-pulse?location_id=...
 * → { ok: true, key }
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get("location_id");

    if (!locationId) {
      return NextResponse.json(
        { ok: false, error: "location_id required" },
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

    const { rows } = await query(
      `
      SELECT c.object_key
      FROM location_clips lc
      JOIN locations l ON l.id = lc.location_id
      JOIN clips c ON c.id = lc.clip_id
      WHERE lc.location_id = $1
        AND l.tenant_id = $2
        AND lc.deleted_at IS NULL
        AND c.deleted_at IS NULL
      ORDER BY lc.created_at DESC
      LIMIT 1
      `,
      [locationId, ctx.tenantId]
    );

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, error: "no clip found for location" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      key: rows[0].object_key,
    });
  } catch (err) {
    console.error("🔥 [location-pulse] resolver error", err);
    return NextResponse.json(
      { ok: false, error: "internal error" },
      { status: 500 }
    );
  }
}
