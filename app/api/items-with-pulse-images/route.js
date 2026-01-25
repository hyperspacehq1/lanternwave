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
    SELECT DISTINCT ic.item_id
      FROM item_clips ic
      JOIN items i ON i.id = ic.item_id
     WHERE i.tenant_id = $1
       AND i.campaign_id = $2
       AND ic.deleted_at IS NULL
    `,
    [ctx.tenantId, campaignId]
  );

  return NextResponse.json({
    ok: true,
    itemIds: rows.map(r => String(r.item_id)),
  });
}
