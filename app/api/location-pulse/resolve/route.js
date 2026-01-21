import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("location_id");

  if (!locationId) {
    return NextResponse.json(
      { error: "location_id required" },
      { status: 400 }
    );
  }

  const ctx = await getTenantContext(req);
  if (!ctx?.tenantId) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  // 1. Resolve Location → clip via location_clips
  const { rows } = await query(
    `
    select c.object_key
    from location_clips lc
    join locations l on l.id = lc.location_id
    join clips c on c.id = lc.clip_id
    where lc.location_id = $1
      and l.tenant_id = $2
      and lc.deleted_at is null
      and c.deleted_at is null
    order by lc.created_at desc
    limit 1
    `,
    [locationId, ctx.tenantId]
  );

  if (!rows.length) {
    return NextResponse.json(
      { error: "no clip found for location" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    key: rows[0].object_key,
  });
}
