import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/players/:id
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params?.id;

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    SELECT *
      FROM players
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     LIMIT 1
    `,
    [tenantId, id]
  );

  return Response.json(
    rows[0]
      ? sanitizeRow(rows[0], {
          first_name: 120,
          last_name: 120,
          character_name: 120,
          notes: 500,
          phone: 50,
          email: 120,
        })
      : null
  );
}

/* -----------------------------------------------------------
   PUT /api/players/:id
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params?.id;
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const sets = [];
  const values = [];
  let i = 1;

  if (body.first_name !== undefined) {
    sets.push(`first_name = $${i++}`);
    values.push(body.first_name || null);
  }

  if (body.last_name !== undefined) {
    sets.push(`last_name = $${i++}`);
    values.push(body.last_name || null);
  }

  if (body.character_name !== undefined) {
    sets.push(`character_name = $${i++}`);
    values.push(body.character_name || null);
  }

  if (body.notes !== undefined) {
    sets.push(`notes = $${i++}`);
    values.push(body.notes || null);
  }

  if (body.phone !== undefined) {
    sets.push(`phone = $${i++}`);
    values.push(body.phone || null);
  }

  if (body.email !== undefined) {
    sets.push(`email = $${i++}`);
    values.push(body.email || null);
  }

  if (!sets.length) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const sql = `
    UPDATE players
       SET ${sets.join(", ")},
           updated_at = NOW()
     WHERE tenant_id = $${i++}
       AND id = $${i}
       AND deleted_at IS NULL
     RETURNING *
  `;

  values.push(tenantId, id);

  const { rows } = await query(sql, values);

  return Response.json(
    rows[0]
      ? sanitizeRow(rows[0], {
          first_name: 120,
          last_name: 120,
          character_name: 120,
          notes: 500,
          phone: 50,
          email: 120,
        })
      : null
  );
}

/* -----------------------------------------------------------
   DELETE /api/players/:id   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params?.id;

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE players
       SET deleted_at = NOW(),
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [tenantId, id]
  );

  return Response.json(
    rows[0]
      ? sanitizeRow(rows[0], {
          first_name: 120,
          last_name: 120,
          character_name: 120,
        })
      : null
  );
}
