import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   GET /api/beacons
-------------------------------------------------- */
export async function GET(req) {
  const { tenant_id, user_id } = await getTenantContext(req);

  const { rows } = await query(
    `
    select beacons
    from account_preferences
    where tenant_id = $1 and user_id = $2
    `,
    [tenant_id, user_id]
  );

  return NextResponse.json({
    beacons: rows[0]?.beacons ?? {},
  });
}

/* -------------------------------------------------
   PUT /api/beacons
-------------------------------------------------- */
export async function PUT(req) {
  const { tenant_id, user_id } = await getTenantContext(req);
  const { key, enabled } = await req.json();

  if (!key || typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "Invalid beacon update" },
      { status: 400 }
    );
  }

  await query(
    `
    insert into account_preferences (id, tenant_id, user_id, beacons)
    values ($1, $2, $3, jsonb_build_object($4, $5))
    on conflict (tenant_id, user_id)
    do update set
      beacons = account_preferences.beacons || jsonb_build_object($4, $5),
      updated_at = now()
    `,
    [uuid(), tenant_id, user_id, key, enabled]
  );

  return NextResponse.json({ success: true });
}
