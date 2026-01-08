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
