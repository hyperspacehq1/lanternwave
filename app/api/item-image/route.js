import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET — fetch existing Item image (by item_id)
============================================================ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("item_id");

    console.log("[item-image][GET] item_id:", itemId);

    if (!itemId) {
      return NextResponse.json(
        { ok: false, error: "missing item_id" },
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
      SELECT ic.clip_id
        FROM item_clips ic
        JOIN items i ON i.id = ic.item_id
       WHERE ic.item_id = $1
         AND i.tenant_id = $2
         AND ic.deleted_at IS NULL
       ORDER BY ic.created_at DESC
       LIMIT 1
      `,
      [itemId, ctx.tenantId]
    );

    return NextResponse.json({
      ok: true,
      clip_id: rows[0]?.clip_id ?? null,
    });
  } catch (err) {
    console.error("[item-image][GET] UNCAUGHT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST — attach image to Item
============================================================ */
export async function POST(req) {
  try {
    const body = await req.json();
    const { item_id, clip_id } = body || {};

    console.log("[item-image][POST] body:", body);

    if (!item_id || !clip_id) {
      return NextResponse.json(
        { ok: false, error: "missing item_id or clip_id" },
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

    await query(
      `
      INSERT INTO item_clips (item_id, clip_id)
      SELECT $1, $2
        FROM items
       WHERE id = $1
         AND tenant_id = $3
      `,
      [item_id, clip_id, ctx.tenantId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[item-image][POST] UNCAUGHT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE — remove image from Item (soft delete)
============================================================ */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("item_id");

    console.log("[item-image][DELETE] item_id:", itemId);

    if (!itemId) {
      return NextResponse.json(
        { ok: false, error: "missing item_id" },
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

    await query(
      `
      UPDATE item_clips ic
         SET deleted_at = NOW()
        FROM items i
       WHERE ic.item_id = $1
         AND i.id = ic.item_id
         AND i.tenant_id = $2
         AND ic.deleted_at IS NULL
      `,
      [itemId, ctx.tenantId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[item-image][DELETE] UNCAUGHT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal server error" },
      { status: 500 }
    );
  }
}
