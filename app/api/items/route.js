import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
function normalizeProperties(input) {
  if (input == null || input === "") return null;

  if (typeof input === "object") return input;

  try {
    const parsed = JSON.parse(input);
    if (typeof parsed === "object") return parsed;
  } catch {}

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
  const sessionId = searchParams.get("session_id");
  let campaignId = searchParams.get("campaign_id");

  // Resolve campaign from session if needed
  if (!campaignId && sessionId) {
    const { rows } = await query(
      `SELECT campaign_id FROM sessions WHERE id = $1`,
      [sessionId]
    );
    campaignId = rows[0]?.campaign_id;
  }

  // Fetch single item
  if (id) {
    const { rows } = await query(
      `
      SELECT *
        FROM items
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
      `,
      [tenantId, id]
    );

    return Response.json(
      rows[0]
        ? sanitizeRow(rows[0], {
            name: 120,
            description: 10000,
            notes: 10000,
            properties: 20000,
          })
        : null
    );
  }

  // If we still don't have a campaign, return empty list
  if (!campaignId) {
    return Response.json([]);
  }

  const { rows } = await query(
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

  return Response.json(
    sanitizeRow(rows, {
      name: 120,
      description: 10000,
      notes: 10000,
      properties: 20000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/items
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId;
  if (!campaignId) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const { rows } = await query(
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
      name,
      body.itemType ?? body.item_type ?? null,
      body.description ?? null,
      body.notes ?? null,
      normalizeProperties(body.properties),
    ]
  );

  return Response.json(
    sanitizeRow(rows[0], {
      name: 120,
      description: 10000,
      notes: 10000,
      properties: 20000,
    }),
    { status: 201 }
  );
}

/* -----------------------------------------------------------
   PUT /api/items?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const sets = [];
  const values = [tenantId, id];
  let i = 3;

  if (body.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(body.name);
  }

  if (body.itemType !== undefined) {
    sets.push(`item_type = $${i++}`);
    values.push(body.itemType);
  }

  if (body.description !== undefined) {
    sets.push(`description = $${i++}`);
    values.push(body.description);
  }

  if (body.notes !== undefined) {
    sets.push(`notes = $${i++}`);
    values.push(body.notes);
  }

  if (body.properties !== undefined) {
    sets.push(`properties = $${i++}`);
    values.push(normalizeProperties(body.properties));
  }

  if (!sets.length) {
    return Response.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE items
       SET ${sets.join(", ")},
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    values
  );

  return Response.json(
    rows[0]
      ? sanitizeRow(rows[0], {
          name: 120,
          description: 10000,
          notes: 10000,
          properties: 20000,
        })
      : null
  );
}

/* -----------------------------------------------------------
   DELETE /api/items?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE items
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
      ? sanitizeRow(rows[0], {
          name: 120,
          description: 10000,
          notes: 10000,
          properties: 20000,
        })
      : null
  );
}
