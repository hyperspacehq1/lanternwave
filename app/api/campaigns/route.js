import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { tenantId } = await getTenantContext(req);

  const { rows } = await query(
    `
    SELECT id, name
      FROM campaigns
     WHERE tenant_id = $1
       AND deleted_at IS NULL
     ORDER BY created_at DESC
    `,
    [tenantId]
  );

  return Response.json({
    ok: true,
    count: rows.length,
    rows,
  });
}
