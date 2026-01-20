import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      player_id,
      base_sanity,
      current_sanity
    FROM player_sanity
    WHERE tenant_id = $1
      AND campaign_id = $2
    `,
    [ctx.tenantId, campaignId]
  );

  return NextResponse.json(rows);
}
