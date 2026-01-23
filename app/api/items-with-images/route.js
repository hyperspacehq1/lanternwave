import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id");

  if (!campaignId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ctx = await getTenantContext(req);

  const { rows } = await query(
    `
    SELECT *
    FROM items_with_images
    WHERE tenant_id = $1
      AND campaign_id = $2
    ORDER BY created_at DESC
    `,
    [ctx.tenantId, campaignId]
  );

  return NextResponse.json({ ok: true, rows });
}
