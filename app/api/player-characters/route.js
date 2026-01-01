import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------
   GET /api/player-characters
----------------------------------------------------- */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  // Resolve campaign → tenant relationship
  let resolvedCampaignId = campaignId;

  if (!resolvedCampaignId) {
    return Response.json([], { status: 200 });
  }

  // Validate campaign belongs to tenant
  const campaignCheck = await query(
    `SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2`,
    [resolvedCampaignId, tenantId]
  );

  if (!campaignCheck.rows.length) {
    return Response.json([], { status: 200 });
  }

  // Single record
  if (id) {
    const { rows } = await query(
      `
      SELECT *
      FROM player_characters
      WHERE id = $1
        AND campaign_id = $2
        AND deleted_at IS NULL
      `,
      [id, resolvedCampaignId]
    );
    return Response.json(rows[0] ?? null);
  }

  // List
  const { rows } = await query(
    `
    SELECT *
    FROM player_characters
    WHERE campaign_id = $1
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    `,
    [resolvedCampaignId]
  );

  return Response.json(rows);
}

/* -----------------------------------------------------
   POST /api/player-characters
----------------------------------------------------- */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const campaignId = body.campaign_id;
  if (!campaignId) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  // Verify campaign belongs to tenant
  const { rows: campaigns } = await query(
    `SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2`,
    [campaignId, tenantId]
  );

  if (!campaigns.length) {
    return Response.json(
      { error: "Invalid campaign" },
      { status: 403 }
    );
  }

  const {
    firstName,
    lastName,
    characterName,
    phone,
    email,
    notes,
  } = body;

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
      firstName ?? null,
      lastName ?? null,
      characterName ?? null,
      phone ?? null,
      email ?? null,
      notes ?? null,
    ]
  );

  return Response.json(rows[0]);
}

/* -----------------------------------------------------
   PUT /api/player-characters
----------------------------------------------------- */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  // Verify ownership
  const check = await query(
    `SELECT id FROM player_characters WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );

  if (!check.rows.length) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const fields = [];
  const values = [];
  let i = 1;

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
      fields.push(`${col} = $${i++}`);
      values.push(body[key]);
    }
  }

  if (!fields.length) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE player_characters
    SET ${fields.join(", ")},
        updated_at = NOW()
    WHERE id = $${i} AND tenant_id = $${i + 1}
    RETURNING *
    `,
    [...values, id, tenantId]
  );

  return Response.json(rows[0]);
}
