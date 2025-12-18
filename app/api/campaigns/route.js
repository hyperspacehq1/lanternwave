import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";
import { fromDb } from "@/lib/campaignMapper";

export const dynamic = "force-dynamic";

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
