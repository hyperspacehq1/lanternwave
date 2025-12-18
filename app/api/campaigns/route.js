import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

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
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const { rows } = await query(
    `INSERT INTO campaigns (tenant_id, name)
     VALUES ($1, $2)
     RETURNING *`,
    [tenantId, body.name]
  );

  return Response.json(rows[0]);
}

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
