import { query } from "@/lib/db";
import { sanitizeRows } from "@/lib/api/sanitize";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters/[id]/npcs
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
    SELECT en.id,
           en.npc_id,
           n.name,
           n.description
      FROM encounter_npcs en
      JOIN encounters e
        ON e.id = en.encounter_id
       AND e.tenant_id = $1
       AND e.deleted_at IS NULL
      JOIN npcs n
        ON n.id = en.npc_id
       AND n.deleted_at IS NULL
     WHERE en.encounter_id = $2
       AND en.deleted_at IS NULL
     ORDER BY en.created_at ASC
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
