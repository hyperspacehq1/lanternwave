import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

function pick(body, camel, snake) {
  return body[camel] ?? body[snake] ?? null;
}

export async function PUT(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params.id;
  const body = await req.json();

  const result = await query(
    `
    UPDATE items
       SET name        = COALESCE($3, name),
           item_type  = COALESCE($4, item_type),
           description = COALESCE($5, description),
           notes       = COALESCE($6, notes),
           properties  = COALESCE($7, properties),
           updated_at  = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      pick(body, "name", "name"),
      pick(body, "itemType", "item_type"),
      pick(body, "description", "description"),
      pick(body, "notes", "notes"),
      pick(body, "properties", "properties"),
    ]
  );

  return Response.json(result.rows[0] || null);
}

export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params.id;

  await query(
    `
    UPDATE items
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
    `,
    [tenantId, id]
  );

  return Response.json({ success: true, id });
}
