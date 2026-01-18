import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { fromDb } from "@/lib/campaignMapper";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------
   GET /api/campaigns/[id]
----------------------------- */
export async function GET(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await query(
    `
    SELECT *
      FROM campaigns
     WHERE id = $1
       AND tenant_id = $2
       AND deleted_at IS NULL
     LIMIT 1
    `,
    [params.id, ctx.tenantId]
  );

  if (!rows.length) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(
    sanitizeRow(fromDb(rows[0]), {
      name: 120,
      description: 10000,
      worldSetting: 10000,
      campaignDate: 50,
      campaignPackage: 50,
      rpgGame: 120,
    })
  );
}

/* -----------------------------
   PUT /api/campaigns/[id]
----------------------------- */
export async function PUT(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.name !== undefined && !String(body.name).trim()) {
    return Response.json(
      { error: "Campaign name cannot be blank" },
      { status: 400 }
    );
  }

  const sets = [];
  const values = [params.id, ctx.tenantId];
  let i = 3;

  if (body.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(String(body.name).trim());
  }

  if (body.description !== undefined) {
    sets.push(`description = $${i++}`);
    values.push(body.description ?? null);
  }

  if (body.worldSetting !== undefined || body.world_setting !== undefined) {
    sets.push(`world_setting = $${i++}`);
    values.push(body.worldSetting ?? body.world_setting ?? null);
  }

  if (body.campaignPackage !== undefined || body.campaign_package !== undefined) {
    sets.push(`campaign_package = $${i++}`);
    values.push(body.campaignPackage ?? body.campaign_package ?? null);
  }

  if (body.campaignDate !== undefined || body.campaign_date !== undefined) {
    sets.push(`campaign_date = $${i++}`);
    values.push(body.campaignDate ?? body.campaign_date ?? null);
  }

  if (body.rpgGame !== undefined || body.rpg_game !== undefined) {
    sets.push(`rpg_game = $${i++}`);
    values.push(body.rpgGame ?? body.rpg_game ?? null);
  }

  if (!sets.length) {
    return Response.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE campaigns
       SET ${sets.join(", ")},
           updated_at = NOW()
     WHERE id = $1
       AND tenant_id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    values
  );

  if (!rows.length) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(
    sanitizeRow(fromDb(rows[0]), {
      name: 120,
      description: 10000,
      worldSetting: 10000,
      campaignDate: 50,
      campaignPackage: 50,
      rpgGame: 120,
    })
  );
}

/* -----------------------------
   DELETE /api/campaigns/[id]
----------------------------- */
export async function DELETE(req, ctxArg) {
  console.log("=== CAMPAIGN DELETE HIT ===");

  console.log("raw ctxArg:", ctxArg);

  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (e) {
    console.log("getTenantContext FAILED", e);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("tenantId:", ctx?.tenantId);
  console.log("userId:", ctx?.user?.id);

  const url = new URL(req.url);
  console.log("req.url:", req.url);
  console.log("searchParams:", Object.fromEntries(url.searchParams.entries()));

  const params = ctxArg?.params;
  console.log("params:", params);
  console.log("params?.id:", params?.id);
  console.log("params?.campaign_id:", params?.campaign_id);

  const id =
    params?.id ??
    params?.campaign_id ??
    url.searchParams.get("id");

  console.log("FINAL RESOLVED id:", id);

  if (!id) {
    console.log("❌ ABORTING: id is missing");
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE campaigns
       SET deleted_at = NOW(),
           updated_at = NOW()
     WHERE id = $1
       AND tenant_id = $2
       AND deleted_at IS NULL
     RETURNING id
    `,
    [id, ctx.tenantId]
  );

  console.log("rows returned:", rows);

  if (!rows.length) {
    console.log("❌ UPDATE MATCHED ZERO ROWS");
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  console.log("✅ DELETE SUCCESS");
  return Response.json({ ok: true });
}
