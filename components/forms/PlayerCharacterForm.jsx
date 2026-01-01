import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET
============================================================ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const sessionId = searchParams.get("session_id");
  let campaignId = searchParams.get("campaign_id");

  // Resolve campaign from session if needed
  if (!campaignId && sessionId) {
    const r = await query(
      `SELECT campaign_id FROM sessions WHERE id = $1`,
      [sessionId]
    );
    campaignId = r.rows[0]?.campaign_id;
  }

  if (!campaignId) return Response.json([]);

  // --------------------------------------------------
  // Single record
  // --------------------------------------------------
  if (id) {
    const { rows } = await query(
      `
      SELECT
        id,
        campaign_id,
        first_name,
        last_name,
        character_name,
        email,
        notes
      FROM player_characters
      WHERE id = $1 AND tenant_id = $2
      `,
      [id, tenantId]
    );

    if (!rows.length) return Response.json(null);

    const r = rows[0];
    return Response.json({
      id: r.id,
      campaignId: r.campaign_id,
      firstName: r.first_name,
      lastName: r.last_name,
      characterName: r.character_name,
      email: r.email,
      notes: r.notes,
    });
  }

  // --------------------------------------------------
  // List
  // --------------------------------------------------
  const { rows } = await query(
    `
    SELECT
      id,
      campaign_id,
      first_name,
      last_name,
      character_name,
      email,
      notes
    FROM player_characters
    WHERE tenant_id = $1
      AND campaign_id = $2
    ORDER BY created_at ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(
    rows.map((r) => ({
      id: r.id,
      campaignId: r.campaign_id,
      firstName: r.first_name,
      lastName: r.last_name,
      characterName: r.character_name,
      email: r.email,
      notes: r.notes,
    }))
  );
}

/* ============================================================
   POST
============================================================ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const {
    campaignId,
    firstName,
    lastName,
    characterName,
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
      email,
      notes
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
    `,
    [
      uuid(),
      tenantId,
      campaignId,
      firstName,
      lastName,
      characterName,
      email,
      notes,
    ]
  );

  const r = rows[0];

  return Response.json({
    id: r.id,
    campaignId: r.campaign_id,
    firstName: r.first_name,
    lastName: r.last_name,
    characterName: r.character_name,
    email: r.email,
    notes: r.notes,
  });
}

/* ============================================================
   PUT
============================================================ */
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
    email: "email",
    notes: "notes",
  };

  for (const [key, column] of Object.entries(map)) {
    if (body[key] !== undefined) {
      fields.push(`${column} = $${i++}`);
      values.push(body[key]);
    }
  }

  if (!fields.length) {
    return Response.json({ error: "Nothing to update" });
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
    email: r.email,
    notes: r.notes,
  });
}
