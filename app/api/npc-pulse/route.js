import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const npcId = searchParams.get("npc_id");

  if (!npcId) {
    return NextResponse.json(
      { error: "npc_id required" },
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

  // 1. Resolve NPC → clip via npc_clips
  const { rows } = await query(
    `
    select c.object_key
    from npc_clips nc
    join npcs n on n.id = nc.npc_id
    join clips c on c.id = nc.clip_id
    where nc.npc_id = $1
      and n.tenant_id = $2
      and nc.deleted_at is null
      and c.deleted_at is null
    order by nc.created_at desc
    limit 1
    `,
    [npcId, ctx.tenantId]
  );

  if (!rows.length) {
    return NextResponse.json(
      { error: "no clip found for npc" },
      { status: 404 }
    );
  }

  // 2. Return resolved clip key
  return NextResponse.json({
    ok: true,
    key: rows[0].object_key,
  });
}
