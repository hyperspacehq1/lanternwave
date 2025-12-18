import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";
import { toDb, fromDb } from "@/lib/campaignMapper";

export const dynamic = "force-dynamic";

/* -------------------------------------------------
   GET /api/campaigns  (list)
-------------------------------------------------- */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);

  const { rows } = await query(
    `
    SELECT *
    FROM campaigns
    WHERE tenant_id = $1
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    `,
    [tenantId]
  );

  return Response.json(rows.map(fromDb));
}

/* -------------------------------------------------
   POST /api/campaigns  (create)
-------------------------------------------------- */
export async function POST(req) {
  const body = await req.json();
  const mapped = toDb(body);

  return Response.json({
    ok: true,
    mapped,
  });
}
