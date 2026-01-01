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
  const campaignId =
    searchParams.get("campaign_id") ?? searchParams.get("campaignId");
  const sessionId =
    searchParams.get("session_id") ?? searchParams.get("sessionId");

  // Resolve campaign from session if needed
  let resolvedCampaignId = campaignId;
  if (!resolvedCampaignId && sessionId) {
    const { rows } = await query(
      `SELECT campaign_id FROM sessions WHERE id = $1`,
      [sessionId]
    );
    resolvedCampaignId = rows[0]?.campaign_id ?? null;
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

  // List by campaign
  if (!resolvedCampaignId) {
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
    [tenantId, resolvedCampaignId]
  );

  return Response.json(rows);
}

/* -----------------------------------------------------
   POST /api/player-characters
----------------------------------------------------- */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId;

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

  const fields = [];
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
      fields.push(`${col} = $${i++}`);
      values.push(body[key]);
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
    RETURNING *
    `,
    values
  );

  return Response.json(rows[0]);
}
