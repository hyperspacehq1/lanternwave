import { query } from "@/lib/db";
import { sanitizeRow } from "@/lib/api/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/sessions/[id]
------------------------------------------------------------ */
export async function GET(req, { params }) {
  let tenantId;

  try {
    const ctx = await getTenantContext(req);
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params?.id;
  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
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

  if (!rows.length) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json(
    sanitizeRow(rows[0], {
      name: 120,
      description: 10000,
      notes: 10000,
    })
  );
}

/* -----------------------------------------------------------
   DELETE /api/sessions/[id]   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  let tenantId;

  try {
    const ctx = await getTenantContext(req);
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params?.id;
  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE sessions
       SET deleted_at = NOW(),
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [tenantId, id]
  );

  if (!rows.length) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json(
    sanitizeRow(rows[0], {
      name: 120,
      description: 10000,
      notes: 10000,
    })
  );
}
