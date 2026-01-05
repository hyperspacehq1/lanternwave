import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTenantContext } from "@/lib/auth";

/* -------------------------------------------------
   GET /api/beacons
-------------------------------------------------- */
export async function GET(req) {
  const { tenantId, userId } = await getTenantContext(req);

  const { rows } = await db.query(
    `
    select beacons
    from account_preferences
    where tenant_id = $1 and user_id = $2
    `,
    [tenantId, userId]
  );

  return NextResponse.json({
    beacons: rows[0]?.beacons ?? {},
  });
}

/* -------------------------------------------------
   PUT /api/beacons
-------------------------------------------------- */
export async function PUT(req) {
  const { tenantId, userId } = await getTenantContext(req);
  const { key, enabled } = await req.json();

  if (!key || typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "Invalid beacon update" },
      { status: 400 }
    );
  }

  await db.query(
    `
    insert into account_preferences (tenant_id, user_id, beacons)
    values ($1, $2, jsonb_build_object($3, $4))
    on conflict (tenant_id, user_id)
    do update set
      beacons = account_preferences.beacons || jsonb_build_object($3, $4),
      updated_at = now()
    `,
    [tenantId, userId, key, enabled]
  );

  return NextResponse.json({ success: true });
}
