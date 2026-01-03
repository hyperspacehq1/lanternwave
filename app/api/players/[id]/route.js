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

  const { rows } = await query(
    `
    UPDATE players
       SET first_name = COALESCE($3, first_name),
           last_name  = COALESCE($4, last_name),
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      body.first_name ?? body.firstName ?? null,
      body.last_name ?? body.lastName ?? null,
    ]
  );

  return Response.json(
    rows[0]
      ? sanitizeRow(rows[0], {
          first_name: 120,
          last_name: 120,
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
        })
      : null
  );
}
