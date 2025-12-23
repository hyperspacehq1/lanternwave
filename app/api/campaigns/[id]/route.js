import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { toDb, fromDb } from "@/lib/campaignMapper";
import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/campaigns/:id
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const { id } = params;

  const { rows } = await query(
    `
    SELECT *
      FROM campaigns
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     LIMIT 1
    `,
    [tenantId, id]
  );

  if (!rows.length) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }

  return Response.json(fromDb(rows[0]));
}

/* -----------------------------------------------------------
   PUT /api/campaigns/:id
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const { id } = params;
  const incoming = await req.json();
  const dbVals = toDb(incoming);

  const sets = [];
  const values = [tenantId, id];
  let i = 3;

  if (dbVals.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(dbVals.name);
  }

  if (dbVals.description !== undefined) {
    sets.push(`description = $${i++}`);
    values.push(dbVals.description);
  }

  if (dbVals.world_setting !== undefined) {
    sets.push(`world_setting = $${i++}`);
    values.push(dbVals.world_setting);
  }

  if (dbVals.campaign_date !== undefined) {
    sets.push(`campaign_date = $${i++}`);
    values.push(dbVals.campaign_date);
  }

  if (dbVals.campaign_package !== undefined) {
    sets.push(`campaign_package = $${i++}`);
    values.push(dbVals.campaign_package);
  }

  if (!sets.length) {
    return Response.json(
      { error: "No valid fields provided" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    UPDATE campaigns
       SET ${sets.join(", ")},
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    values
  );

  if (!rows.length) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }

  return Response.json(fromDb(rows[0]));
}

/* -----------------------------------------------------------
   DELETE /api/campaigns/:id   (soft delete)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const { id } = params;

  const { rows } = await query(
    `
    UPDATE campaigns
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING id
    `,
    [tenantId, id]
  );

  if (!rows.length) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }

export async function GET(req, { params }) {
  const row = await /* existing query logic */;

  return Response.json(
    sanitizeRow(
      fromDb(row),
      {
        name: 120,
        description: 10000,
        worldSetting: 10000,
        notes: 10000,
      }
    )
  );
}
