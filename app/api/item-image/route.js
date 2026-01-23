import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET — load current item image
============================================================ */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("item_id");

  if (!itemId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ctx = await getTenantContext(req);

  const { rows } = await query(
    `
    SELECT clip_id
      FROM item_clips
     WHERE tenant_id = $1
       AND item_id = $2
       AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1
    `,
    [ctx.tenantId, itemId]
  );

  return NextResponse.json({
    ok: true,
    clip_id: rows[0]?.clip_id ?? null,
  });
}

/* ============================================================
   POST — attach image to item
============================================================ */
export async function POST(req) {
  const body = await req.json();
  const { item_id, clip_id } = body;

  if (!item_id || !clip_id) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ctx = await getTenantContext(req);

  await query(
    `
    INSERT INTO item_clips (tenant_id, item_id, clip_id)
    VALUES ($1, $2, $3)
    `,
    [ctx.tenantId, item_id, clip_id]
  );

  return NextResponse.json({ ok: true });
}

/* ============================================================
   DELETE — remove image from item (SOFT DELETE)
============================================================ */
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("item_id");

  if (!itemId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ctx = await getTenantContext(req);

  await query(
    `
    UPDATE item_clips
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND item_id = $2
       AND deleted_at IS NULL
    `,
    [ctx.tenantId, itemId]
  );

  return NextResponse.json({ ok: true });
}
