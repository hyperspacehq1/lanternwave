import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLES = [
  "campaigns",
  "sessions",
  "encounters",
  "events",
  "npcs",
  "locations",
  "items",
];

/* -----------------------------------------------------------
   POST /api/reindex-embeddings
------------------------------------------------------------ */
export async function POST(req) {
  const ctx = await getTenantContext(req);
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
  const { table } = await req.json();

  if (!TABLES.includes(table)) {
    return Response.json({ error: "Invalid table" }, { status: 400 });
  }

  await query(
    `
    UPDATE ${table}
       SET search_body =
           COALESCE(name, '') || ' ' || COALESCE(description, ''),
           search_tsv =
           to_tsvector('english',
             COALESCE(name, '') || ' ' || COALESCE(description, '')
           )
     WHERE tenant_id = $1
       AND deleted_at IS NULL
    `,
    [tenantId]
  );

  return Response.json({
    ok: true,
    table,
    message: "Reindex completed",
  });
}
