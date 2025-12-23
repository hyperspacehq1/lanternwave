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
   GET /api/campaigns/:id
------------------------------------------------------------ */
export async function GET(req, { params }) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

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
   PUT /api/campaigns/:id
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
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
    sets.push(`description = $${i++}`);
    values.push(db.description);
  }
  if (db.world_setting !== undefined) {
    sets.push(`world_setting = $${i++}`);
    values.push(db.world_setting);
  }
  if (db.campaign_date !== undefined) {
    sets.push(`campaign_date = $${i++}`);
    values.push(db.campaign_date);
  }
  if (db.campaign_package !== undefined) {
    sets.push(`campaign_package = $${i++}`);
    values.push(db.campaign_package);
  }

  if (!sets.length) {
    return Response.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE campaigns
       SET ${sets.join(", ")},
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    values
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
   DELETE /api/campaigns/:id
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

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
