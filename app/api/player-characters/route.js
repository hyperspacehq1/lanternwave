import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------
   GET
----------------------------------------------------- */
export async function GET(req) {
  console.log("🔍 [GET] /api/player-characters");

  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const qp = Object.fromEntries(searchParams.entries());
  console.log("➡️ Query params:", qp);

  const id = searchParams.get("id");

  // Accept BOTH campaign_id and campaignId
  const campaignIdParam =
    searchParams.get("campaign_id") ??
    searchParams.get("campaignId") ??
    null;

  const sessionId =
    searchParams.get("session_id") ??
    searchParams.get("sessionId") ??
    null;

  // ---------- SINGLE RECORD ----------
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

    console.log("📦 Single DB rows:", rows.length);

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

  // ---------- RESOLVE CAMPAIGN (optional) ----------
  let campaignIdFinal = campaignIdParam;

  if (!campaignIdFinal && sessionId) {
    console.log("🔍 Resolving campaign from session:", sessionId);
    const { rows } = await query(
      `SELECT campaign_id FROM sessions WHERE id = $1`,
      [sessionId]
    );
    campaignIdFinal = rows[0]?.campaign_id ?? null;
  }

  console.log("🎯 Final campaignId:", campaignIdFinal);

  // ---------- LIST ----------
  // If campaignIdFinal is missing, return ALL tenant characters (no campaign filter)
  const sql = campaignIdFinal
    ? `
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
    `
    : `
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
        AND deleted_at IS NULL
      ORDER BY created_at ASC
    `;

  const params = campaignIdFinal ? [tenantId, campaignIdFinal] : [tenantId];

  const { rows } = await query(sql, params);

  console.log("📦 Player characters found:", rows.length);
  if (rows.length) console.table(rows.slice(0, 20));

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

/* -----------------------------------------------------
   POST
----------------------------------------------------- */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  console.log("🟢 CREATE player_character", body);

  const campaignId = body.campaign_id ?? body.campaignId ?? null;

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

/* -----------------------------------------------------
   PUT
----------------------------------------------------- */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const body = await req.json();

  console.log("✏️ UPDATE player_character:", id, body);

  const fields = [];
  const values = [tenantId, id];
  let i = 3;

  const map = {
    // allow both camel + snake inputs safely
    firstName: "first_name",
    lastName: "last_name",
    characterName: "character_name",
    phone: "phone",
    email: "email",
    notes: "notes",
  };

  for (const [key, column] of Object.entries(map)) {
    const val = body[key] ?? body[column] ?? undefined;
    if (val !== undefined) {
      fields.push(`${column} = $${i++}`);
      values.push(val);
    }
  }

  // allow updating campaign_id too if you need it
  const campaignId = body.campaign_id ?? body.campaignId ?? undefined;
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
    SET ${fields.join(", ")}, updated_at = NOW()
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
