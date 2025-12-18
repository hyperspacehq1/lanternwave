import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const { rows } = await query(
    `
    INSERT INTO campaigns (tenant_id, name)
    VALUES ($1, $2)
    RETURNING id, name
    `,
    [tenantId, body.name]
  );

  return Response.json(rows[0], { status: 201 });
}
