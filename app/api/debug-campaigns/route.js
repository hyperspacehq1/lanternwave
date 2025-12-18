import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { tenantId, user } = await getTenantContext(req);
  const body = await req.json();

  if (!body?.name || !String(body.name).trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    INSERT INTO debug_campaigns (
      tenant_id,
      name,
      description,
      world_setting,
      campaign_date,
      campaign_package,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'standard'), $7)
    RETURNING *
    `,
    [
      tenantId,
      String(body.name).trim(),
      body.description ?? null,
      body.world_setting ?? null,
      body.campaign_date ?? null,
      body.campaign_package ?? null,
      user?.id ?? null,
    ]
  );

  return Response.json(rows[0], { status: 201 });
}
