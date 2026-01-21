import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * LOCATION RESOLVER
 * -----------------
 * GET /api/location-pulse?location_id=...
 * → { ok: true, key }
 */
export async function GET(req) {
  console.log("🟢 [location-pulse] HIT resolver route");

  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get("location_id");

    console.log("🟢 [location-pulse] location_id:", locationId);

    if (!locationId) {
      console.warn("🔴 [location-pulse] missing location_id");
      return NextResponse.json(
        { ok: false, error: "location_id required" },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(req);
    console.log("🟢 [location-pulse] tenant:", ctx?.tenantId);

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

    console.log("🟢 [location-pulse] rows:", rows);

    if (!rows.length) {
      console.warn("🟡 [location-pulse] no clip found");
      return NextResponse.json(
        { ok: false, error: "no clip found for location" },
        { status: 404 }
      );
    }

    console.log("✅ [location-pulse] resolved key:", rows[0].object_key);

    return NextResponse.json({
      ok: true,
      key: rows[0].object_key,
    });
  } catch (err) {
    console.error("🔥 [location-pulse] ERROR", err);
    return NextResponse.json(
      { ok: false, error: "internal error" },
      { status: 500 }
    );
  }
}
