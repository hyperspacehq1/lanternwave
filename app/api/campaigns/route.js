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
  const { tenantId, user } = await getTenantContext(req);
  const body = await req.json();

  if (!body?.name || !body.name.trim()) {
    return Response.json(
      { error: "Campaign name is required" },
      { status: 400 }
    );
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
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      tenantId,
      db.name,
      db.description,
      db.world_setting,
      db.campaign_date,
      user.id,
    ]
  );

  return Response.json(fromDb(rows[0]), { status: 201 });
}
