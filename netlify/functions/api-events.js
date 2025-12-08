// netlify/functions/api-events.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

const json = (status, payload) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

/* -----------------------------------------------------------
   GET /api-events
------------------------------------------------------------ */
async function handleGET(event) {
  const qs = event.queryStringParameters || {};
  const id = qs.id;
  const sessionId = qs.session_id;
  const campaignId = qs.campaign_id;

  // ────────────────────────
  // SINGLE EVENT
  // ────────────────────────
  if (id) {
    const eventRes = await query(
      `SELECT * FROM events WHERE id=$1 LIMIT 1`,
      [id]
    );

    if (eventRes.rows.length === 0)
      return json(404, { error: "Event not found" });

    const eventRow = eventRes.rows[0];

    const npcs = (
      await query(
        `
        SELECT npcs.*
        FROM event_npcs en
        JOIN npcs ON npcs.id = en.npc_id
        WHERE en.event_id=$1
        `,
        [id]
      )
    ).rows;

    const locations = (
      await query(
        `
        SELECT l.*
        FROM event_locations el
        JOIN locations l ON l.id = el.location_id
        WHERE el.event_id=$1
        `,
        [id]
      )
    ).rows;

    const items = (
      await query(
        `
        SELECT i.*
        FROM event_items ei
        JOIN items i ON i.id = ei.item_id
        WHERE ei.event_id=$1
        `,
        [id]
      )
    ).rows;

    return json(200, { ...eventRow, npcs, locations, items });
  }

  // ────────────────────────
  // EVENTS FOR SESSION
  // ────────────────────────
  if (sessionId) {
    const result = await query(
      `
      SELECT *
      FROM events
      WHERE session_id=$1
      ORDER BY priority DESC, created_at ASC
      `,
      [sessionId]
    );
    return json(200, result.rows);
  }

  // ────────────────────────
  // EVENTS FOR CAMPAIGN
  // ────────────────────────
  if (campaignId) {
    const result = await query(
      `
      SELECT *
      FROM events
      WHERE campaign_id=$1
      ORDER BY priority DESC, created_at ASC
      `,
      [campaignId]
    );
    return json(200, result.rows);
  }

  return json(400, { error: "id, session_id, or campaign_id required" });
}

/* -----------------------------------------------------------
   POST /api-events
------------------------------------------------------------ */
async function handlePOST(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const body = JSON.parse(event.body || "{}");

  const {
    campaign_id,
    session_id,
    description,
    event_type,
    weather,
    trigger_detail,
    priority,
    countdown_minutes,
    npc_ids = [],
    location_ids = [],
    item_ids = [],
  } = body;

  if (!description)
    return json(400, { error: "description is required" });

  const result = await query(
    `
    INSERT INTO events
      (campaign_id, session_id, description, event_type, weather,
       trigger_detail, priority, countdown_minutes, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())
    RETURNING *
    `,
    [
      campaign_id || null,
      session_id || null,
      description,
      event_type || "Normal",
      weather || null,
      trigger_detail || "",
      priority || 1,
      countdown_minutes || null,
    ]
  );

  const eventRow = result.rows[0];
  const eventId = eventRow.id;

  // Attach NPCs
  for (const npcId of npc_ids) {
    await query(
      `INSERT INTO event_npcs (event_id, npc_id)
       VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [eventId, npcId]
    );
  }

  // Attach Locations
  for (const locId of location_ids) {
    await query(
      `INSERT INTO event_locations (event_id, location_id)
       VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [eventId, locId]
    );
  }

  // Attach Items
  for (const itemId of item_ids) {
    await query(
      `INSERT INTO event_items (event_id, item_id)
       VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [eventId, itemId]
    );
  }

  return json(201, eventRow);
}

/* -----------------------------------------------------------
   PUT /api-events?id=
------------------------------------------------------------ */
async function handlePUT(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: "id is required" });

  const body = JSON.parse(event.body || "{}");

  const {
    description,
    event_type,
    weather,
    trigger_detail,
    priority,
    countdown_minutes,
    npc_ids,
    location_ids,
    item_ids,
  } = body;

  const result = await query(
    `
    UPDATE events
       SET description       = COALESCE($2, description),
           event_type        = COALESCE($3, event_type),
           weather           = COALESCE($4, weather),
           trigger_detail    = COALESCE($5, trigger_detail),
           priority          = COALESCE($6, priority),
           countdown_minutes = COALESCE($7, countdown_minutes),
           updated_at        = NOW()
     WHERE id=$1
     RETURNING *
    `,
    [
      id,
      description,
      event_type,
      weather,
      trigger_detail,
      priority,
      countdown_minutes,
    ]
  );

  if (result.rows.length === 0)
    return json(404, { error: "Event not found" });

  const updated = result.rows[0];

  // Replace join tables
  if (npc_ids) {
    await query(`DELETE FROM event_npcs WHERE event_id=$1`, [id]);
    for (const npcId of npc_ids) {
      await query(
        `INSERT INTO event_npcs (event_id,npc_id) VALUES ($1,$2)`,
        [id, npcId]
      );
    }
  }

  if (location_ids) {
    await query(`DELETE FROM event_locations WHERE event_id=$1`, [id]);
    for (const locId of location_ids) {
      await query(
        `INSERT INTO event_locations (event_id,location_id) VALUES ($1,$2)`,
        [id, locId]
      );
    }
  }

  if (item_ids) {
    await query(`DELETE FROM event_items WHERE event_id=$1`, [id]);
    for (const itemId of item_ids) {
      await query(
        `INSERT INTO event_items (event_id,item_id) VALUES ($1,$2)`,
        [id, itemId]
      );
    }
  }

  return json(200, updated);
}

/* -----------------------------------------------------------
   DELETE /api-events?id=
------------------------------------------------------------ */
async function handleDELETE(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: "id is required" });

  const result = await query(
    `DELETE FROM events WHERE id=$1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0)
    return json(404, { error: "Event not found" });

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
    console.error("api-events error:", err);
    return json(500, { error: err.message || "Internal Server Error" });
  }
};
