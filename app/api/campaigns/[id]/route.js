import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { toDb, fromDb } from "@/lib/campaignMapper";

export const dynamic = "force-dynamic";

const ALLOWED_CAMPAIGN_PACKAGES = new Set([
  "standard",
  "starter",
  "advanced",
  "premium",
]);

/* -----------------------------------------------------------
   Helper — read id from query (?id=)
------------------------------------------------------------ */
function getId(req) {
  const { searchParams } = new URL(req.url);
  return searchParams.get("id");
}

/* -----------------------------------------------------------
   GET /api/campaigns?id=
------------------------------------------------------------ */
export async function GET(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = getId(req);
  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    SELECT *
      FROM campaigns
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     LIMIT 1
    `,
    [tenantId, id]
  );

  if (!rows.length) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }

  return Response.json(
    sanitizeRow(fromDb(rows[0]), {
      name: 120,
      description: 10000,
      worldSetting: 10000,
      campaignDate: 50,
      campaignPackage: 50,
    })
  );
}

/* -----------------------------------------------------------
   PUT /api/campaigns?id=   ✅ OPTION A
------------------------------------------------------------ */
export async function PUT(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = getId(req);
  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const body = await req.json();

  if ("name" in body && (!body.name || !body.name.trim())) {
    return Response.json(
      { error: "Campaign name cannot be blank" },
      { status: 400 }
    );
  }

  if (
    "campaignPackage" in body &&
    !ALLOWED_CAMPAIGN_PACKAGES.has(body.campaignPackage)
  ) {
    return Response.json(
      { error: "Invalid campaign package" },
      { status: 400 }
    );
  }

  const db = toDb({
    name: body?.name,
    description: body?.description,
    worldSetting: body?.worldSetting,
    campaignDate: body?.campaignDate,
    campaignPackage: body?.campaignPackage,
  });

  const sets = [];
  const values = [tenantId, id];
  let i = 3;

  if (db.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(db.name);
  }
  if (db.description !== undefined) {
