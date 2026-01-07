import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters/[id]
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const id = params?.id;

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    SELECT id, campaign_id, name, description, created_at, updated_at
      FROM encounters
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     LIMIT 1
    `,
    [tenantId, id]
  );

  if (!rows.length) {
    return Response.json({ error: "Encounter not found" }, { status: 404 });
  }

  return Response.json(
    sanitizeRow(rows[0], {
      name: 120,
      description: 10000,
    })
  );
}

/* -----------------------------------------------------------
   DELETE /api/encounters/[id]   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const id = params?.id;

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE encounters
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
    return Response.json({ error: "Encounter not found" }, { status: 404 });
  }

  return Response.json(
    sanitizeRow(rows[0], {
      name: 120,
      description: 10000,
    })
  );
}
