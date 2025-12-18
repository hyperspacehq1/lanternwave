import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/getTenantContext";

export const dynamic = "force-dynamic";

const ALLOWED = [
  "campaigns",
  "events",
  "encounters",
  "items",
  "locations",
  "npcs",
];

/* -----------------------------------------------------------
   POST /api/vector-search
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const { table, q } = await req.json();

  if (!ALLOWED.includes(table)) {
    return Response.json({ error: "Invalid table" }, { status: 400 });
  }

  if (!q || q.trim().length < 2) {
    return Response.json({ error: "Query too short" }, { status: 400 });
  }

  const result = await query(
    `
    SELECT *
    FROM ${table}
    WHERE tenant_id = $1
      AND deleted_at IS NULL
      AND search_tsv @@ plainto_tsquery('english', $2)
    ORDER BY ts_rank(search_tsv, plainto_tsquery('english', $2)) DESC
    LIMIT 20
    `,
    [tenantId, q]
  );

  return Response.json(result.rows);
}
