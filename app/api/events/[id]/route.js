import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/events/:id
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
      FROM events
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
          name: 200,
          description: 20000,
          searchBody: 20000,
        })
      : null
  );
}

/* -----------------------------------------------------------
   PUT /api/events/:id
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
    UPDATE events
       SET name        = COALESCE($3, name),
           description = COALESCE($4, description),
           event_type  = COALESCE($5, event_type),
           priority    = COALESCE($6, priority),
           search_body = COALESCE($7, search_body),
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
      body.event_type ?? body.eventType,
      body.priority,
      body.search_body ?? body.searchBody,
    ]
  );

  return Response.json(
    rows[0]
      ? sanitizeRow(rows[0], {
          name: 200,
          description: 20000,
          searchBody: 20000,
        })
      : null
  );
}

/* -----------------------------------------------------------
   DELETE /api/events/:id  (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params?.id;

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE events
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
          name: 200,
          description: 20000,
          searchBody: 20000,
        })
      : null
  );
}

