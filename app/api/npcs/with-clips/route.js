import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id");
  const sessionId = searchParams.get("session_id");

  if (!campaignId || !sessionId) {
    return NextResponse.json({ ok: false, error: "missing params" }, { status: 400 });
  }

  const ctx = await getTenantContext(req);
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { rows } = await query(
    `
    select distinct nc.npc_id
    from npcs_clips nc
    join npcs n on n.id = nc.npc_id
    where n.campaign_id = $1
      and n.session_id = $2
      and n.tenant_id = $3
    `,
    [campaignId, sessionId, ctx.tenantId]
  );

  return NextResponse.json({
    ok: true,
    npcIds: rows.map(r => String(r.npc_id)),
  });
}
