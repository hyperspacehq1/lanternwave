import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ITEM PULSE RESOLVER
 * ------------------
 * GET /api/item-pulse?item_id=...
 * → { ok: true, key }
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const itemId = url.searchParams.get("item_id");

    if (!itemId) {
      return NextResponse.json(
        { ok: false, error: "item_id required" },
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
      FROM item_clips ic
      JOIN items i ON i.id = ic.item_id
      JOIN clips c ON c.id = ic.clip_id
      WHERE ic.item_id = $1
        AND i.tenant_id = $2
        AND ic.deleted_at IS NULL
        AND c.deleted_at IS NULL
      ORDER BY ic.created_at DESC
      LIMIT 1
      `,
      [itemId, ctx.tenantId]
    );

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, error: "no clip found for item" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      key: rows[0].object_key,
    });
  } catch (err) {
    console.error("🔥 [item-pulse] error", err);
    return NextResponse.json(
      { ok: false, error: "internal error" },
      { status: 500 }
    );
  }
}
