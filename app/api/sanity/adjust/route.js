// /app/api/sanity/adjust/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const ctx = await getTenantContext(req);
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const { player_id, campaign_id, delta } = body || {};

  if (!player_id || !campaign_id || !Number.isInteger(delta)) {
    return NextResponse.json(
      { ok: false, error: "player_id, campaign_id, delta required" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    UPDATE player_sanity
       SET current_sanity = current_sanity + $1,
           updated_at = NOW()
     WHERE tenant_id = $2
       AND campaign_id = $3
       AND player_id = $4
     RETURNING current_sanity
    `,
    [delta, ctx.tenantId, campaign_id, player_id]
  );

  if (!rows.length) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    current_sanity: rows[0].current_sanity,
  });
}
