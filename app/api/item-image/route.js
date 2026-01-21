import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET — fetch existing Item image (by item_id)
============================================================ */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("item_id");

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
    SELECT clip_id
    FROM item_clips
    WHERE item_id = $1
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [itemId]
  );

  return NextResponse.json({
    ok: true,
    clip_id: rows[0]?.clip_id ?? null,
  });
}

/* ============================================================
   POST — attach image to Item
============================================================ */
export async function POST(req) {
  const body = await req.json();
  const { item_id, clip_id } = body || {};

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
    VALUES ($1, $2)
    `,
    [item_id, clip_id]
  );

  return NextResponse.json({ ok: true });
}
