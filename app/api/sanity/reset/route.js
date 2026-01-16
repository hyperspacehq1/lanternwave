import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  POST /api/sanity/reset
  Resets current_sanity = base_sanity for all players in a campaign
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
      update player_sanity
      set current_sanity = base_sanity,
          updated_at = now()
      where tenant_id = $1
        and campaign_id = $2
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
