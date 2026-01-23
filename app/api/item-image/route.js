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
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

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
  const ctx = await getTenantContext(req);
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let item_id, clip_id;

  // ✅ Support JSON body
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json();
      item_id = body?.item_id;
      clip_id = body?.clip_id;
    }
  } catch {
    // ignore — fallback below
  }

  // ✅ Support query params fallback
  if (!item_id || !clip_id) {
    const { searchParams } = new URL(req.url);
    item_id ??= searchParams.get("item_id");
    clip_id ??= searchParams.get("clip_id");
  }

  if (!item_id || !clip_id) {
    return NextResponse.json(
      { ok: false, error: "Missing item_id or clip_id" },
      { status: 400 }
    );
  }

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
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

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
