import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  GET /api/initiative/list?campaign_id=...
  Returns initiative data for all players in a campaign
*/
export async function GET(req) {
  const ctx = await getTenantContext(req);

  if (!ctx?.tenantId) {
    return NextResponse.json([], { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id");

  if (!campaignId) {
    return NextResponse.json([]);
  }

  const { rows } = await query(
    `
    SELECT
      id AS player_id,
      initiative_score,
      initiative_bonus,
      (initiative_score + initiative_bonus) AS starting_initiative,
      initiative_current
    FROM players
    WHERE tenant_id = $1
      AND campaign_id = $2
      AND deleted_at IS NULL
    `,
    [ctx.tenantId, campaignId]
  );

  return NextResponse.json(rows);
}
