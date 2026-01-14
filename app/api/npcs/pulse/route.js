import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const npcId = searchParams.get("npc_id");

  if (!npcId) {
    return NextResponse.json({ ok: false, error: "missing npc_id" }, { status: 400 });
  }

  const ctx = await getTenantContext(req);
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { rows } = await query(
    `
    select c.object_key
    from npcs_clips nc
    join clips c on c.id = nc.clip_id
    where nc.npc_id = $1
      and c.tenant_id = $2
      and c.deleted_at is null
    order by nc.created_at desc
    limit 1
    `,
    [npcId, ctx.tenantId]
  );

  if (!rows.length) {
    return NextResponse.json({ ok: false, error: "no clip found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, key: rows[0].object_key });
}
