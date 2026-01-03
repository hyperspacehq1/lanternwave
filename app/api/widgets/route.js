import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

/* -------------------------------------------------
   GET /api/widgets
   Page-scoped widget preferences
-------------------------------------------------- */
export async function GET(req) {
  const { tenantId, userId } = await getTenantContext(req);

  const { rows } = await query(
    `
    SELECT *
    FROM user_widgets
    WHERE tenant_id = $1
      AND user_id = $2
    ORDER BY created_at ASC
    `,
    [tenantId, userId]
  );

  return NextResponse.json(rows);
}

/* -------------------------------------------------
   POST /api/widgets
   Upsert widget preferences
-------------------------------------------------- */
export async function POST(req) {
  const { tenantId, userId } = await getTenantContext(req);
  const body = await req.json();

  if (!body.widget_key) {
    return NextResponse.json(
      { error: "widget_key is required" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    INSERT INTO user_widgets (
      tenant_id,
      user_id,
      widget_key,
      state
    )
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (tenant_id, user_id, widget_key)
    DO UPDATE SET
      state = EXCLUDED.state,
      updated_at = now()
    RETURNING *
    `,
    [
      tenantId,
      userId,
      body.widget_key,
      body.state ?? {},
    ]
  );

  return NextResponse.json(rows[0], { status: 201 });
}

/* -------------------------------------------------
   DELETE /api/widgets
   Remove widget preferences
-------------------------------------------------- */
export async function DELETE(req) {
  const { tenantId, userId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const widgetKey = searchParams.get("widget_key");

  if (!widgetKey) {
    return NextResponse.json(
      { error: "widget_key is required" },
      { status: 400 }
    );
  }

  await query(
    `
    DELETE FROM user_widgets
    WHERE tenant_id = $1
      AND user_id = $2
      AND widget_key = $3
    `,
    [tenantId, userId, widgetKey]
  );

  return NextResponse.json({ success: true });
}
