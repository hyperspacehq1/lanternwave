// netlify/functions/api-npcs.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

// JSON helper
const json = (status, payload) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

/* -----------------------------------------------------------
   GET /api-npcs
------------------------------------------------------------ */
async function handleGET(event) {
  const qs = event.queryStringParameters || {};
  const id = qs.id;
  const campaignId = qs.campaign_id;
  const sessionId = qs.session_id;

  // ───────────────────────
  // GET A SINGLE NPC
  // ───────────────────────
  if (id) {
    const npcRes = await query(
      `SELECT * FROM npcs WHERE id=$1 LIMIT 1`,
      [id]
    );

    if (npcRes.rows.length === 0)
      return json(404, { error: "NPC not found" });

    const events = (
      await query(
        `
        SELECT e.*
        FROM event_npcs en
        JOIN events e ON e.id = en.event_id
        WHERE en.npc_id=$1
        ORDER BY e.created_at ASC
        `,
        [id]
      )
    ).rows;

    return json(200, { ...npcRes.rows[0], events });
  }

  // ───────────────────────
  // GET NPCs FOR A CAMPAIGN
  // ───────────────────────
  if (campaignId) {
    const result = await query(
      `
      SELECT DISTINCT n.*
      FROM npcs n
      JOIN event_npcs en ON en.npc_id=n.id
      JOIN events e ON e.id=en.event_id
      WHERE e.campaign_id=$1
      ORDER BY n.first_name ASC, n.last_name ASC
      `,
      [campaignId]
    );
    return json(200, result.rows);
  }

  // ───────────────────────
  // GET NPCs FOR A SESSION
  // ───────────────────────
  if (sessionId) {
    const result = await query(
      `
      SELECT DISTINCT n.*
      FROM npcs n
      JOIN event_npcs en ON en.npc_id=n.id
      JOIN events e ON e.id=en.event_id
      WHERE e.session_id=$1
      ORDER BY n.first_name ASC, n.last_name ASC
      `,
      [sessionId]
    );
    return json(200, result.rows);
  }

  // ───────────────────────
  // GET ALL NPCs
  // ───────────────────────
  const result = await query(
    `SELECT * FROM npcs ORDER BY first_name ASC, last_name ASC`
  );

  return json(200, result.rows);
}

/* -----------------------------------------------------------
   POST /api-npcs
------------------------------------------------------------ */
async function handlePOST(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const body = JSON.parse(event.body || "{}");

  const {
    first_name,
    last_name,
    npc_type,
    data,
    personality,
    goals,
    faction_alignment,
    secrets,
    state,
  } = body;

  if (!first_name)
    return json(400, { error: "first_name is required" });

  const result = await query(
    `
    INSERT INTO npcs
      (first_name, last_name, npc_type, data, personality, goals,
       faction_alignment, secrets, state, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW())
    RETURNING *
    `,
    [
      first_name,
      last_name || "",
      npc_type || "neutral",
      data || "",
      personality || "",
      goals || "",
      faction_alignment || "",
      secrets || "",
      state || "alive",
    ]
  );

  return json(201, result.rows[0]);
}

/* -----------------------------------------------------------
   PUT /api-npcs?id=
------------------------------------------------------------ */
async function handlePUT(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: "id is required" });

  const body = JSON.parse(event.body || "{}");

  const {
    first_name,
    last_name,
    npc_type,
    data,
    personality,
    goals,
    faction_alignment,
    secrets,
    state,
  } = body;

  const result = await query(
    `
    UPDATE npcs
       SET first_name        = COALESCE($2, first_name),
           last_name         = COALESCE($3, last_name),
           npc_type          = COALESCE($4, npc_type),
           data              = COALESCE($5, data),
           personality       = COALESCE($6, personality),
           goals             = COALESCE($7, goals),
           faction_alignment = COALESCE($8, faction_alignment),
           secrets           = COALESCE($9, secrets),
           state             = COALESCE($10, state),
           updated_at        = NOW()
     WHERE id=$1
     RETURNING *
    `,
    [
      id,
      first_name,
      last_name,
      npc_type,
      data,
      personality,
      goals,
      faction_alignment,
      secrets,
      state,
    ]
  );

  if (result.rows.length === 0)
    return json(404, { error: "NPC not found" });

  return json(200, result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-npcs?id=
------------------------------------------------------------ */
async function handleDELETE(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: "id is required" });

  const result = await query(
    `DELETE FROM npcs WHERE id=$1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0)
    return json(404, { error: "NPC not found" });

  return json(200, { success: true, id });
}

/* -----------------------------------------------------------
   MAIN HANDLER — Classic Runtime
------------------------------------------------------------ */
export const handler = async (event, context) => {
  try {
    switch (event.httpMethod) {
      case "GET": return await handleGET(event);
      case "POST": return await handlePOST(event);
      case "PUT":
      case "PATCH": return await handlePUT(event);
      case "DELETE": return await handleDELETE(event);
      default: return json(405, { error: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("api-npcs error:", err);
    return json(500, { error: err.message || "Internal Server Error" });
  }
};
