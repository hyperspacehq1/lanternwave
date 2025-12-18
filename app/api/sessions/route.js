import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/sessions?id= OR ?campaign_id=
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  if (id) {
    const rows = await query(
      `
      SELECT *
      FROM sessions
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [tenantId, id]
    );

    if (!rows.rows.length) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    return Response.json(rows.rows[0]);
  }

  if (campaignId) {
    const rows = await query(
      `
      SELECT *
      FROM sessions
      WHERE tenant_id = $1
        AND campaign_id = $2
        AND deleted_at IS NULL
      ORDER BY created_at ASC
      `,
      [tenantId, campaignId]
    );

    return Response.json(rows.rows);
  }

  return Response.json(
    { error: "Either id or campaign_id is required" },
    { status: 400 }
  );
}

/* -----------------------------------------------------------
   POST /api/sessions
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  if (!body.campaign_id) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  // Validate campaign ownership
  const campaign = await query(
    `
    SELECT id
    FROM campaigns
    WHERE tenant_id = $1
      AND id = $2
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [tenantId, body.campaign_id]
  );

  if (!campaign.rows.length) {
    return Response.json(
      { error: "Invalid campaign_id" },
      { status: 403 }
    );
  }

  const rows = await query(
    `
    INSERT INTO sessions (
      tenant_id,
      campaign_id,
      description,
      geography,
      notes,
      history,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
    RETURNING *
    `,
    [
      tenantId,
      body.campaign_id,
      body.description ?? "",
      body.geography ?? "",
      body.notes ?? "",
      body.history ?? "",
    ]
  );

  return Response.json(rows.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api/sessions?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const body = await req.json();

  const rows = await query(
    `
    UPDATE sessions
       SET description = COALESCE($3, description),
           geography  = COALESCE($4, geography),
           notes      = COALESCE($5, notes),
           history    = COALESCE($6, history),
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      body.description,
      body.geography,
      body.notes,
      body.history,
    ]
  );

  if (!rows.rows.length) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json(rows.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api/sessions?id=
   (soft delete)
------------------------------------------------------------ */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const rows = await query(
    `
    UPDATE sessions
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING id
    `,
    [tenantId, id]
  );

  if (!rows.rows.length) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json({ success: true, id });
}
