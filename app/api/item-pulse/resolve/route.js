import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("item_id");

  if (!itemId) {
    return NextResponse.json(
      { error: "item_id required" },
      { status: 400 }
    );
  }

  const ctx = await getTenantContext(req);
  if (!ctx?.tenantId) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  // 1. Resolve Item → clip via item_clips
  const { rows } = await query(
    `
    select c.object_key
    from item_clips ic
    join items i on i.id = ic.item_id
    join clips c on c.id = ic.clip_id
    where ic.item_id = $1
      and i.tenant_id = $2
      and ic.deleted_at is null
      and c.deleted_at is null
    order by ic.created_at desc
    limit 1
    `,
    [itemId, ctx.tenantId]
  );

  if (!rows.length) {
    return NextResponse.json(
      { error: "no clip found for item" },
      { status: 404 }
    );
  }

  // 2. Return resolved clip key
  return NextResponse.json({
    ok: true,
    key: rows[0].object_key,
  });
}
