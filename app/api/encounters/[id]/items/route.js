import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters/:id/items
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;

  const { rows } = await query(
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

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      notes: 10000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/encounters/:id/items
------------------------------------------------------------ */
export async function POST(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;
  const body = await req.json();

  if (!body.item_id) {
    return Response.json({ error: "item_id is required" }, { status: 400 });
  }

  const { rows } = await query(
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

  return Response.json(rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   DELETE /api/encounters/:id/items?item_id=
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("item_id");

  if (!itemId) {
    return Response.json({ error: "item_id is required" }, { status: 400 });
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

  return Response.json({ ok: true }, { status: 200 });
}
