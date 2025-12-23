import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters/:id/items
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;

  const result = await query(
    `
    SELECT
      ei.id        AS join_id,
      ei.item_id,
      i.name,
      i.item_type,
      ei.quantity,
      ei.notes,
      ei.created_at
    FROM encounter_items ei
    JOIN items i
      ON i.id = ei.item_id
     AND i.deleted_at IS NULL
     AND i.tenant_id = $2
    JOIN encounters e
      ON e.id = ei.encounter_id
     AND e.tenant_id = $2
    WHERE ei.encounter_id = $1
      AND ei.tenant_id = $2
    ORDER BY i.name ASC
    `,
    [encounterId, tenantId]
  );

  return Response.json(result.rows);
}

/* -----------------------------------------------------------
   POST /api/encounters/:id/items
------------------------------------------------------------ */
export async function POST(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;
  const body = await req.json();

  if (!body.item_id) {
    return Response.json(
      { error: "item_id is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO encounter_items (
      tenant_id,
      encounter_id,
      item_id,
      quantity,
      notes
    )
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (tenant_id, encounter_id, item_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      notes    = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *
    `,
    [
      tenantId,
      encounterId,
      body.item_id,
      body.quantity ?? 1,
      body.notes ?? null,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   DELETE /api/encounters/:id/items
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("item_id");

  if (!itemId) {
    return Response.json(
      { error: "item_id is required" },
      { status: 400 }
    );
  }

  await query(
    `
    DELETE FROM encounter_items
     WHERE tenant_id = $1
       AND encounter_id = $2
       AND item_id = $3
    `,
    [tenantId, encounterId, itemId]
  );

 export async function GET(req, { params }) {
  const rows = await /* existing join query */;

  return Response.json(
    sanitizeRows(
      rows,
      {
        name: 120,
        description: 10000,
        notes: 10000,
      }
    )
  );
}
