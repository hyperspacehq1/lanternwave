import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   Helpers
------------------------------------------------------------ */
function pick(body, camel, snake) {
  return body[camel] ?? body[snake] ?? null;
}

function normalizeJson(input) {
  if (input == null || input === "") return null;

  if (typeof input === "object") return input;

  try {
    const parsed = JSON.parse(input);
    if (typeof parsed === "object") return parsed;
  } catch {}

  // human free-text fallback
  return {
    text: String(input).trim(),
    source: "human",
    updated_at: new Date().toISOString(),
  };
}

/* -----------------------------------------------------------
   GET /api/items
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  if (id) {
    const result = await query(
      `
      SELECT *
        FROM items
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       LIMIT 1
      `,
      [tenantId, id]
    );

    return Response.json(result.rows[0] || null);
  }

  if (!campaignId) {
    return Response.json([]);
  }

  const list = await query(
    `
    SELECT *
      FROM items
     WHERE tenant_id = $1
       AND campaign_id = $2
       AND deleted_at IS NULL
     ORDER BY name ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(list.rows);
}

/* -----------------------------------------------------------
   POST /api/items
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const name = pick(body, "name", "name");
  const item_type = pick(body, "itemType", "item_type");
  const description = pick(body, "description", "description");
  const notes = pick(body, "notes", "notes");
  const properties = normalizeJson(
    pick(body, "properties", "properties")
  );

  const campaignId =
    body.campaign_id ?? body.campaignId ?? null;

  if (!campaignId) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  if (!name || !name.trim()) {
    return Response.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO items (
      tenant_id,
      campaign_id,
      name,
      item_type,
      description,
      notes,
      properties
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
    `,
    [
      tenantId,
      campaignId,
      name.trim(),
      item_type,
      description,
      notes,
      properties,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api/items/:id
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params.id;
  const body = await req.json();

  const result = await query(
    `
    UPDATE items
       SET name        = COALESCE($3, name),
           item_type  = COALESCE($4, item_type),
           description = COALESCE($5, description),
           notes       = COALESCE($6, notes),
           properties  = COALESCE($7, properties),
           updated_at  = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      pick(body, "name", "name"),
      pick(body, "itemType", "item_type"),
      pick(body, "description", "description"),
      pick(body, "notes", "notes"),
      normalizeJson(pick(body, "properties", "properties")),
    ]
  );

  return Response.json(result.rows[0] || null);
}

/* -----------------------------------------------------------
   DELETE /api/items/:id
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params.id;

  await query(
    `
    UPDATE items
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
    `,
    [tenantId, id]
  );

  return Response.json({ success: true, id });
}
