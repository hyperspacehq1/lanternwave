import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";
import { toDb, fromDb } from "@/lib/campaignMapper";

export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const db = toDb(body);

  const { rows } = await query(
    `
    INSERT INTO campaigns (
      tenant_id,
      name,
      description,
      world_setting,
      campaign_date,
      campaign_package
    )
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'standard'))
    RETURNING *
    `,
    [
      tenantId,
      db.name,
      db.description ?? null,
      db.world_setting ?? null,
      db.campaign_date ?? null,
      db.campaign_package ?? null,
    ]
  );

  return Response.json(fromDb(rows[0]), { status: 201 });
}
