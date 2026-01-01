import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/player-characters
   - ?id=... (single)
   - ?campaign_id=... (list by campaign)
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  let campaignId = searchParams.get("campaign_id");
  const sessionId = searchParams.get("session_id");

  if (!campaignId && sessionId) {
    const { rows } = await query(
      `SELECT campaign_id FROM sessions WHERE id = $1`,
      [sessionId]
    );
    campaignId = rows[0]?.campaign_id;
  }

  if (id) {
    const { rows } = await query(
      `
      SELECT
        id,
        campaign_id,
        first_name,
        last_name,
        character_name,
        phone,
        email,
        notes,
        created_at,
        updated_at
      FROM player_characters
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      `,
      [tenantId, id]
    );

    return Response.json(
      rows[0]
        ? sanitizeRow(rows[0], {
            first_name: 100,
            last_name: 100,
            character_name: 120,
            email: 255,
            notes: 5000,
          })
        : null
    );
  }

  if (!campaignId) {
    return Response.json([]);
  }

  const { rows } = await query(
    `
    SELECT
      id,
      campaign_id,
      first_name,
      last_name,
      character_name,
      phone,
      email,
      notes,
      created_at
    FROM player_characters
    WHERE tenant_id = $1
      AND campaign_id = $2
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(
    sanitizeRows(rows, {
      first_name: 100,
      last_name: 100,
      character_name: 120,
      email: 255,
      notes: 5000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/player-characters
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId;
  if (!campaignId) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

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
      notes
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      uuid(),
      tenantId,
      campaignId,
      body.firstName ?? null,
      body.lastName ?? null,
      body.characterName ?? null,
      body.phone ?? null,
      body.email ?? null,
      body.notes ?? null,
    ]
  );

  return Response.json(
    sanitizeRow(rows[0], {
      first_name: 100,
      last_name: 100,
      character_name: 120,
      email: 255,
      notes: 5000,
    })
  );
}

/* -----------------------------------------------------------
   PUT /api/player-characters?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  const updates = [];
  const values = [tenantId, id];
  let i = 3;

  const map = {
    firstName: "first_name",
    lastName: "last_name",
    characterName: "character_name",
    phone: "phone",
    email: "email",
    notes: "notes",
  };

  for (const [key, col] of Object.entries(map)) {
    if (body[key] !== undefined) {
      updates.push(`${col} = $${i++}`);
      values.push(body[key]);
    }
  }

  const campaignId = body.campaign_id ?? body.campaignId;
  if (campaignId !== undefined) {
    updates.push(`campaign_id = $${i++}`);
    values.push(campaignId);
  }

  if (!updates.length) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE player_characters
    SET ${updates.join(", ")},
        updated_at = NOW()
    WHERE tenant_id = $1
      AND id = $2
    RETURNING *
    `,
    values
  );

  return Response.json(
    sanitizeRow(rows[0], {
      first_name: 100,
      last_name: 100,
      character_name: 120,
      email: 255,
      notes: 5000,
    })
  );
}

