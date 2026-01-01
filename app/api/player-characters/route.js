import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/player-characters
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  // ─────────────────────────────
  // Fetch single character
  // ─────────────────────────────
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

    if (!rows.length) return Response.json(null);

    const r = rows[0];
    return Response.json({
      id: r.id,
      campaignId: r.campaign_id,
      firstName: r.first_name,
      lastName: r.last_name,
      characterName: r.character_name,
      phone: r.phone,
      email: r.email,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  }

  // -------------------------------------------------
  // Resolve campaign if only session_id is provided
  // -------------------------------------------------
  let campaignIdFinal = campaignId;

  if (!campaignIdFinal && searchParams.get("session_id")) {
    const { rows } = await query(
      `SELECT campaign_id FROM sessions WHERE id = $1`,
      [searchParams.get("session_id")]
    );
    campaignIdFinal = rows[0]?.campaign_id;
  }

  if (!campaignIdFinal) return Response.json([]);

  // -------------------------------------------------
  // Fetch all characters for campaign
  // -------------------------------------------------
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
      AND campaign_id = $2
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    `,
    [tenantId, campaignIdFinal]
  );

  return Response.json(
    rows.map((r) => ({
      id: r.id,
      campaignId: r.campaign_id,
      firstName: r.first_name,
      lastName: r.last_name,
      characterName: r.character_name,
      phone: r.phone,
      email: r.email,
      notes: r.notes,
    }))
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

  const { firstName, lastName, characterName, phone, email, notes } = body;

  if (!firstName || !lastName) {
    return Response.json(
      { error: "firstName and lastName are required" },
      { status: 400 }
    );
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
      firstName,
      lastName,
      characterName ?? null,
      phone ?? null,
      email ?? null,
      notes ?? null,
    ]
  );

  const r = rows[0];

  return Response.json({
    id: r.id,
    campaignId: r.campaign_id,
    firstName: r.first_name,
    lastName: r.last_name,
    characterName: r.character_name,
    phone: r.phone,
    email: r.email,
    notes: r.notes,
  });
}

/* -----------------------------------------------------------
   PUT /api/player-characters
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const fields = [];
  const values = [tenantId, id];
  let idx = 3;

  const map = {
    firstName: "first_name",
    lastName: "last_name",
    characterName: "character_name",
    phone: "phone",
    email: "email",
    notes: "notes",
  };

  for (const [key, dbKey] of Object.entries(map)) {
    if (body[key] !== undefined) {
      fields.push(`${dbKey} = $${idx++}`);
      values.push(body[key]);
    }
  }

  if (!fields.length) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE player_characters
    SET ${fields.join(", ")},
        updated_at = NOW()
    WHERE tenant_id = $1 AND id = $2
    RETURNING *
    `,
    values
  );

  const r = rows[0];
  return Response.json({
    id: r.id,
    campaignId: r.campaign_id,
    firstName: r.first_name,
    lastName: r.last_name,
    characterName: r.character_name,
    phone: r.phone,
    email: r.email,
    notes: r.notes,
  });
}

/* -----------------------------------------------------------
   DELETE /api/player-characters
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
    UPDATE player_characters
    SET deleted_at = NOW()
    WHERE tenant_id = $1
      AND id = $2
    RETURNING *
    `,
    [tenantId, id]
  );

  return Response.json(
    rows[0]
      ? {
          id: rows[0].id,
          campaignId: rows[0].campaign_id,
          firstName: rows[0].first_name,
          lastName: rows[0].last_name,
          characterName: rows[0].character_name,
          phone: rows[0].phone,
          email: rows[0].email,
          notes: rows[0].notes,
        }
      : null
  );
}
