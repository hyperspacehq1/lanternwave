import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters
   - campaign-scoped
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  // Fetch single encounter
  if (id) {
    const result = await query(
      `
      SELECT *
        FROM encounters
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       LIMIT 1
      `,
      [tenantId, id]
    );

    return Response.json(result.rows[0] || null);
  }

  // Fetch encounters for campaign
  if (campaignId) {
    const result = await query(
      `
      SELECT *
        FROM encounters
       WHERE tenant_id = $1
         AND campaign_id = $2
         AND deleted_at IS NULL
       ORDER BY created_at ASC
      `,
      [tenantId, campaignId]
    );

    return Response.json(result.rows);
  }

  return Response.json([]);
}

/* -----------------------------------------------------------
   POST /api/encounters
   - campaign only (Option A)
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();
  const id = uuid();

  const campaignId = body.campaign_id ?? body.campaignId ?? null;
  const name = body.name?.trim();

  if (!campaignId) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  if (!name) {
    return Response.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO encounters (
      id,
      tenant_id,
      campaign_id,
      name,
      description,
      notes,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
    RETURNING *
    `,
    [
      id,
      tenantId,
      campaignId,
      name,
      body.description ?? null,
      body.notes ?? null,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api/encounters?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const body = await req.json();

  const result = await query(
    `
    UPDATE encounters
       SET name        = COALESCE($3, name),
           description = COALESCE($4, description),
           notes       = COALESCE($5, notes),
           updated_at  = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      body.name,
      body.description,
      body.notes,
    ]
  );

  return Response.json(result.rows[0] || null);
}

/* -----------------------------------------------------------
   DELETE /api/encounters?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  await query(
    `
    UPDATE encounters
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
    `,
    [tenantId, id]
  );

export async function GET(req) {
  const rows = await /* existing query logic */;

  return Response.json(
    sanitizeRows(
      rows.map(fromDb),
      {
        name: 120,
        description: 10000,
        notes: 10000,
      }
    )
  );
}
