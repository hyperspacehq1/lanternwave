import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";
import { toDb, fromDb } from "@/lib/campaignMapper";

export const dynamic = "force-dynamic";

const ALLOWED_CAMPAIGN_PACKAGES = new Set([
  "standard",
  "starter",
  "advanced",
  "premium",
]);

/* -------------------------------------------------
   GET /api/campaigns
-------------------------------------------------- */
export async function GET(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return Response.json(
    sanitizeRows(rows.map(fromDb), {
      name: 120,
      description: 10000,
      worldSetting: 10000,
      campaignDate: 50,
      campaignPackage: 50,
    })
  );
}

/* -------------------------------------------------
   POST /api/campaigns
-------------------------------------------------- */
export async function POST(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim()
      : "New Campaign";

  const campaignPackage = body?.campaignPackage ?? "standard";

  if (!ALLOWED_CAMPAIGN_PACKAGES.has(campaignPackage)) {
    return Response.json(
      { error: "Invalid campaign package" },
      { status: 400 }
    );
  }

  const db = toDb({
    name,
    description: body?.description,
    worldSetting: body?.worldSetting,
    campaignDate: body?.campaignDate,
    campaignPackage,
  });

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
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      tenantId,
      db.name,
      db.description ?? null,
      db.world_setting ?? null,
      db.campaign_date ?? null,
      db.campaign_package,
    ]
  );

  return Response.json(
    sanitizeRow(fromDb(rows[0]), {
      name: 120,
      description: 10000,
      worldSetting: 10000,
      campaignDate: 50,
      campaignPackage: 50,
    }),
    { status: 201 }
  );
}

/* -------------------------------------------------
   DELETE /api/campaigns?id=
-------------------------------------------------- */
export async function DELETE(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE campaigns
       SET deleted_at = NOW(),
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [tenantId, id]
  );

  return Response.json(
    rows[0]
      ? sanitizeRow(fromDb(rows[0]), {
          name: 120,
          description: 10000,
          worldSetting: 10000,
          campaignDate: 50,
          campaignPackage: 50,
        })
      : null
  );
}
