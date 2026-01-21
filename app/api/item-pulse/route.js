import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ITEM RESOLVER (LOCATION CONTEXT)
 * -------------------------------
 * GET /api/item-pulse?item_id=...&location_id=...
 * → { ok: true, key }
 */
export async function GET(req) {
  console.log("🟢 [item-pulse] HIT resolver route");

  try {
    const url = new URL(req.url);
    const itemId = url.searchParams.get("item_id");
    const locationId = url.searchParams.get("location_id");

    console.log("🟢 [item-pulse] item_id:", itemId);
    console.log("🟢 [item-pulse] location_id:", locationId);

    if (!itemId || !locationId) {
      console.warn("🔴 [item-pulse] missing item_id or location_id");
      return NextResponse.json(
        { ok: false, error: "item_id and location_id required" },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(req);
    console.log("🟢 [item-pulse] tenant:", ctx?.tenantId);

    if (!ctx?.tenantId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    /**
     * Item images come from their Location context:
     * item_id + location_id → location_items → location_clips → clips
     */
    const { rows } = await query(
      `
      SELECT c.object_key
      FROM location_items li
      JOIN location_clips lc ON lc.location_id = li.location_id
      JOIN locations l ON l.id = li.location_id
      JOIN clips c ON c.id = lc.clip_id
      WHERE li.item_id = $1
        AND li.location_id = $2
        AND li.tenant_id = $3
        AND li.deleted_at IS NULL
        AND lc.deleted_at IS NULL
        AND c.deleted_at IS NULL
      ORDER BY lc.created_at DESC
      LIMIT 1
      `,
      [itemId, locationId, ctx.tenantId]
    );

    console.log("🟢 [item-pulse] rows:", rows);

    if (!rows.length) {
      console.warn("🟡 [item-pulse] no clip found");
      return NextResponse.json(
        { ok: false, error: "no clip found for item at location" },
        { status: 404 }
      );
    }

    console.log("✅ [item-pulse] resolved key:", rows[0].object_key);

    return NextResponse.json({
      ok: true,
      key: rows[0].object_key,
    });
  } catch (err) {
    console.error("🔥 [item-pulse] ERROR", err);
    return NextResponse.json(
      { ok: false, error: "internal error" },
      { status: 500 }
    );
  }
}
