import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id");

  if (!campaignId) {
    return NextResponse.json(
      { ok: false, error: "missing campaign_id" },
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
    SELECT DISTINCT nc.npc_id
      FROM npc_clips nc
      JOIN npcs n ON n.id = nc.npc_id
     WHERE n.tenant_id = $1
       AND n.campaign_id = $2
       AND nc.deleted_at IS NULL
    `,
    [ctx.tenantId, campaignId]
  );

  return NextResponse.json({
    ok: true,
    npcIds: rows.map(r => String(r.npc_id)),
  });
}
