import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  POST /api/initiative/reset
  Resets initiative_current = initiative_score + initiative_bonus
  for all players in a campaign
*/
export async function POST(req) {
  const ctx = await getTenantContext(req);
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const { campaign_id } = body || {};

  if (!campaign_id) {
    return NextResponse.json(
      { ok: false, error: "campaign_id required" },
      { status: 400 }
    );
  }

  try {
    await query(
      `
      UPDATE players
         SET initiative_current = COALESCE(initiative_score, 0) + COALESCE(initiative_bonus, 0),
             updated_at = NOW()
       WHERE tenant_id = $1
         AND campaign_id = $2
         AND deleted_at IS NULL
      `,
      [ctx.tenantId, campaign_id]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

