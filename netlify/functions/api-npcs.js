// netlify/functions/api-npcs.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

/* -----------------------------------------------------------
   GET /api-npcs
   - ?id=UUID              → get a single NPC
   - ?campaign_id=UUID     → NPCs appearing in events for that campaign
   - ?session_id=UUID      → NPCs appearing in events for that session
   - none                  → list all NPCs
------------------------------------------------------------ */
async function handleGET(request) {
  const id = request.query.get("id");
  const campaignId = request.query.get("campaign_id");
  const sessionId = request.query.get("session_id");

  /* ---------------------------------------------
     GET ONE NPC
  --------------------------------------------- */
  if (id) {
    const npcRes = await query(
      `SELECT *
       FROM npcs
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (npcRes.rows.length === 0) {
      return NetlifyResponse.json(
        { error: "NPC not found" },
        { status: 404 }
      );
    }

    // Also return events this NPC participates in
    const events = (
      await query(
        `
        SELECT e.*
        FROM event_npcs en
        JOIN events e ON e.id = en.event_id
        WHERE en.npc_id = $1
        ORDER BY e.created_at ASC
        `,
        [id]
      )
    ).rows;

    return NetlifyResponse.json({
      ...npcRes.rows[0],
      events,
    });
  }

  /* ---------------------------------------------
     NPCs linked to a CAMPAIGN (via events)
  --------------------------------------------- */
  if (campaignId) {
    const result = await query(
      `
      SELECT DISTINCT n.*
      FROM npcs n
      JOIN event_npcs en ON en.npc_id = n.id
      JOIN events e ON e.id = en.event_id
      WHERE e.campaign_id = $1
      ORDER BY n.first_name ASC, n.last_name ASC
      `,
      [campaignId]
    );
    return NetlifyResponse.json(result.rows);
  }

  /* ---------------------------------------------
     NPCs linked to a SESSION (via events)
  --------------------------------------------- */
  if (sessionId) {
    const result = await query(
      `
      SELECT DISTINCT n.*
      FROM npcs n
      JOIN event_npcs en ON en.npc_id = n.id
      JOIN events e ON e.id = en.event_id
      WHERE e.session_id = $1
      ORDER BY n.first_name ASC, n.last_name ASC
      `,
      [sessionId]
    );
    return NetlifyResponse.json(result.rows);
  }

  /* ---------------------------------------------
     GET ALL NPCs
  --------------------------------------------- */
  const result = await query(
    `SELECT *
     FROM npcs
     ORDER BY first_name ASC, last_name ASC`
  );

  return NetlifyResponse.json(result.rows);
}

/* -----------------------------------------------------------
   POST /api-npcs
   Create NPC
------------------------------------------------------------ */
async function handlePOST(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const body = await request.json();
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

  if (!first_name) {
    return NetlifyResponse.json(
      { error: "first_name is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO npcs
      (first_name, last_name, npc_type, data, personality,
       goals, faction_alignment, secrets, state, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5,
            $6, $7, $8, $9, NOW(), NOW())
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

  return NetlifyResponse.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api-npcs?id=UUID
   Update NPC
------------------------------------------------------------ */
async function handlePUT(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const id = request.query.get("id");
  if (!id) {
    return NetlifyResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  const body = await request.json();

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
    WHERE id = $1
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

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "NPC not found" },
      { status: 404 }
    );
  }

  return NetlifyResponse.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-npcs?id=UUID
   Deletes NPC + event associations
------------------------------------------------------------ */
async function handleDELETE(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const id = request.query.get("id");

  if (!id) {
    return NetlifyResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  // Will automatically cascade delete links if FKs use ON DELETE CASCADE
  const result = await query(
    `DELETE FROM npcs
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "NPC not found" },
      { status: 404 }
    );
  }

  return NetlifyResponse.json({ success: true, id });
}

/* -----------------------------------------------------------
   MAIN HANDLER — Netlify 2025
------------------------------------------------------------ */
export default async function handler(request) {
  try {
    switch (request.method) {
      case "GET":
        return await handleGET(request);

      case "POST":
        return await handlePOST(request);

      case "PUT":
      case "PATCH":
        return await handlePUT(request);

      case "DELETE":
        return await handleDELETE(request);

      default:
        return NetlifyResponse.json(
          { error: "Method Not Allowed" },
          { status: 405 }
        );
    }
  } catch (err) {
    console.error("api-npcs error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
