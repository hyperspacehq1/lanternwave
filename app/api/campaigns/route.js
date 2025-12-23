import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";
import { toDb, fromDb } from "@/lib/campaignMapper";
import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";

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

export async function GET(req) {
  const rows = await /* existing query logic */;

  return Response.json(
    sanitizeRows(
      rows.map(fromDb),
      {
        name: 120,
        description: 10000,
        worldSetting: 10000,
        notes: 10000,
      }
    )
  );
}