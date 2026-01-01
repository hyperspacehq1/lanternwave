import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireTenant(tenantId) {
  if (!tenantId) {
    return Response.json(
      { error: "Missing tenant context" },
      { status: 401 }
    );
  }
  return null;
}

/* -----------------------------------------------------
   GET /api/player-characters
----------------------------------------------------- */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const tenantErr = requireTenant(tenantId);
  if (tenantErr) return tenantErr;

  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const sessionId =
    searchParams.get("session_id") ?? searchParams.get("sessionId");
  let campaignId =
    searchParams.get("campaign_id") ?? searchParams.get("campaignId");

  // Optional session fallback -> campaign_id (same pattern as encounters route)
  if (!campaignId && sessionId) {
    const { rows } = await query(
      `SELECT campaign_id FROM sessions WHERE id = $1`,
      [sessionId]
    );
    campaignId = rows[0]?.campaign_id ?? null;
  }

  // Single record
  if (id) {
    const { rows } = await query(
      `
      SELECT *
      FROM player_characters
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      `,
      [tenantId, id]
    );

    return Response.json(rows[0] ?? null);
  }

  // Campaign-scoped list (same as encounters)
  if (!campaignId) {
    return Response.json([]);
  }

  const { rows } = await query(
    `
    SELECT *
    FROM player_characters
    WHERE tenant_id = $1
      AND campaign_id = $2
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(rows);
}

/* -----------------------------------------------------
   POST /api/player-characters
----------------------------------------------------- */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const tenantErr = requireTenant(tenantId);
  if (tenantErr) return tenantErr;

  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId ?? null;
  if (!campaignId) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  // Accept both snake_case and camelCase inputs
  const firstName = body.firstName ?? body.first_name ?? null;
  const lastName = body.lastName ?? body.last_name ?? null;
  const characterName = body.characterName ?? body.character_name ?? null;
  const phone = body.phone ?? null;
  const email = body.email ?? null;
  const notes = body.notes ?? null;

  const { rows } = await query(
    `
    INSERT INTO player_characters (
      id,
      tenant_id,
      campaign_id,
      first_name,
      last_name,
      character_name,
      phone,
      email,
      notes,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
    RETURNING *
    `,
    [
      uuid(),
      tenantId,
      campaignId,
      firstName,
      lastName,
      characterName,
      phone,
      email,
      notes,
    ]
  );

  return Response.json(rows[0], { status: 201 });
}

/* -----------------------------------------------------
   PUT /api/player-characters?id=
----------------------------------------------------- */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const tenantErr = requireTenant(tenantId);
  if (tenantErr) return tenantErr;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const fields = [];
  const values = [tenantId, id];
  let i = 3;

  // Accept both camel + snake
  const map = [
    ["firstName", "first_name"],
    ["lastName", "last_name"],
    ["characterName", "character_name"],
    ["phone", "phone"],
    ["email", "email"],
    ["notes", "notes"],
  ];

  for (const [camel, col] of map) {
    const val = body[camel] ?? body[col];
    if (val !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(val);
    }
  }

  const campaignId = body.campaign_id ?? body.campaignId;
  if (campaignId !== undefined) {
    fields.push(`campaign_id = $${i++}`);
    values.push(campaignId);
  }

  if (!fields.length) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE player_characters
    SET ${fields.join(", ")},
        updated_at = NOW()
    WHERE tenant_id = $1
      AND id = $2
      AND deleted_at IS NULL
    RETURNING *
    `,
    values
  );

  return Response.json(rows[0] ?? null);
}

/* -----------------------------------------------------
   DELETE /api/player-characters?id=   (SOFT DELETE)
----------------------------------------------------- */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const tenantErr = requireTenant(tenantId);
  if (tenantErr) return tenantErr;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE player_characters
       SET deleted_at = NOW(),
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [tenantId, id]
  );

  return Response.json(rows[0] ?? null);
}
