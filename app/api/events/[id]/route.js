import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/events/[id]
------------------------------------------------------------ */
export async function GET(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await params in case Next.js wraps it in a Promise (Next.js 15+)
  const resolvedParams = await Promise.resolve(params);
  const tenantId = ctx.tenantId;
  const id = resolvedParams?.id;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { rows } = await query(
    `
    SELECT id,
           campaign_id,
           name,
           description,
           event_type,
           priority,
           search_body,
           created_at,
           updated_at
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
   DELETE /api/events/[id]   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await params in case Next.js wraps it in a Promise (Next.js 15+)
  const resolvedParams = await Promise.resolve(params);
  const tenantId = ctx.tenantId;
  const id = resolvedParams?.id;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

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

