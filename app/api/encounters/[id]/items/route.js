import { query } from "@/lib/db";
import { sanitizeRows } from "@/lib/api/sanitize";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters/[id]/items
------------------------------------------------------------ */
export async function GET(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encounterId = params?.id;
  if (!encounterId) {
    return Response.json({ error: "encounter id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    SELECT ei.id,
           ei.item_id,
           ei.quantity,
           i.name,
           i.description
      FROM encounter_items ei
      JOIN encounters e
        ON e.id = ei.encounter_id
       AND e.tenant_id = $1
       AND e.deleted_at IS NULL
      JOIN items i
        ON i.id = ei.item_id
       AND i.deleted_at IS NULL
     WHERE ei.encounter_id = $2
       AND ei.deleted_at IS NULL
     ORDER BY ei.created_at ASC
    `,
    [ctx.tenantId, encounterId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      description: 10000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/encounters/[id]/items
------------------------------------------------------------ */
export async function POST(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encounterId = params?.id;
  const { item_id, quantity } = await req.json();

  if (!encounterId || !item_id) {
    return Response.json(
      { error: "encounter_id and item_id required" },
      { status: 400 }
    );
  }

  await query(
    `
    INSERT INTO encounter_items (
      tenant_id,
      encounter_id,
      item_id,
      quantity
    )
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (tenant_id, encounter_id, item_id)
    DO NOTHING
    `,
    [ctx.tenantId, encounterId, item_id, quantity ?? null]
  );

  return Response.json({ ok: true });
}

/* -----------------------------------------------------------
   PATCH /api/encounters/[id]/items
   Update quantity only
------------------------------------------------------------ */
export async function PATCH(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encounterId = params?.id;
  const { item_id, quantity } = await req.json();

  if (!encounterId || !item_id) {
    return Response.json(
      { error: "encounter_id and item_id required" },
      { status: 400 }
    );
  }

  // quantity may be NULL (allowed)
  if (quantity !== null && quantity !== undefined) {
    if (!Number.isInteger(quantity) || quantity < 0) {
      return Response.json(
        { error: "quantity must be a non-negative integer or null" },
        { status: 400 }
      );
    }
  }

  await query(
    `
    UPDATE encounter_items
       SET quantity = $4
     WHERE tenant_id = $1
       AND encounter_id = $2
       AND item_id = $3
       AND deleted_at IS NULL
    `,
    [ctx.tenantId, encounterId, item_id, quantity ?? null]
  );

  return Response.json({ ok: true });
}

/* -----------------------------------------------------------
   DELETE /api/encounters/[id]/items
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encounterId = params?.id;
  const { item_id } = await req.json();

  if (!encounterId || !item_id) {
    return Response.json(
      { error: "encounter_id and item_id required" },
      { status: 400 }
    );
  }

  await query(
    `
    UPDATE encounter_items
       SET deleted_at = now()
     WHERE tenant_id = $1
       AND encounter_id = $2
       AND item_id = $3
       AND deleted_at IS NULL
    `,
    [ctx.tenantId, encounterId, item_id]
  );

  return Response.json({ ok: true });
}
