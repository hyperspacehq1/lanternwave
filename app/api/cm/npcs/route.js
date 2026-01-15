import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  console.log("🟢 [NPC LIST] route HIT");

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id");

  console.log("🟢 campaign_id =", campaignId);

  if (!campaignId) {
    console.log("🔴 missing campaign_id");
    return NextResponse.json(
      { ok: false, error: "missing campaign_id" },
      { status: 400 }
    );
  }

  let ctx;
  try {
    ctx = await getTenantContext(req);
    console.log("🟢 tenant_id =", ctx?.tenantId);
  } catch (err) {
    console.error("🔴 getTenantContext failed", err);
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  if (!ctx?.tenantId) {
    console.log("🔴 no tenantId in context");
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  console.log("🟢 querying npc_with_images view");

  const { rows } = await query(
    `
    SELECT *
    FROM npc_with_images
    WHERE tenant_id = $1
      AND campaign_id = $2
    ORDER BY created_at DESC
    `,
    [ctx.tenantId, campaignId]
  );

  console.log(
    "🟢 rows returned:",
    rows.length,
    rows.slice(0, 2) // sample first 2
  );

  const hasImageField =
    rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], "image_clip_id");

  console.log("🟢 image_clip_id present on rows =", hasImageField);

  return NextResponse.json({
    ok: true,
    rows,
  });
}
