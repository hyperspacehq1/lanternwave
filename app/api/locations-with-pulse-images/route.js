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
    SELECT DISTINCT lc.location_id
      FROM location_clips lc
      JOIN locations l ON l.id = lc.location_id
     WHERE l.tenant_id = $1
       AND l.campaign_id = $2
       AND lc.deleted_at IS NULL
    `,
    [ctx.tenantId, campaignId]
  );

  return NextResponse.json({
    ok: true,
    locationIds: rows.map(r => String(r.location_id)),
  });
}
