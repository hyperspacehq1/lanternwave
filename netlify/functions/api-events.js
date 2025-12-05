// netlify/functions/api-events.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

/* -----------------------------------------------------------
   GET /api-events
   - ?id=UUID → get a single event
   - ?session_id=UUID → list events for a session
   - ?campaign_id=UUID → list events for a campaign
------------------------------------------------------------ */
async function handleGET(request) {
  const id = request.query.get("id");
  const sessionId = request.query.get("session_id");
  const campaignId = request.query.get("campaign_id");

  if (id) {
    // Get one event + linked NPCs, Locations, Items
    const eventRes = await query(
      `SELECT *
       FROM events
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (eventRes.rows.length === 0) {
      return NetlifyResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const event = eventRes.rows[0];

    // Linked NPCs
    const npcs = (
      await query(
        `SELECT npcs.*
         FROM event_npcs en
         JOIN npcs ON npcs.id = en.npc_id
         WHERE en.event_id = $1`,
        [id]
      )
    ).rows;

    // Linked Locations
    const locations = (
      await query(
        `SELECT locations.*
         FROM event_locations el
         JOIN locations ON locations.id = el.location_id
         WHERE el.event_id = $1`,
        [id]
      )
    ).rows;

    // Linked Items
    const items = (
      await query(
        `SELECT items.*
         FROM event_items ei
         JOIN items ON items.id = ei.item_id
         WHERE ei.event_id = $1`,
        [id]
      )
    ).rows;

    return NetlifyResponse.json({
      ...event,
      npcs,
      locations,
      items,
    });
  }

  // Events by session
  if (sessionId) {
    const result = await query(
      `SELECT *
       FROM events
       WHERE session_id = $1
       ORDER BY priority DESC, created_at ASC`,
      [sessionId]
    );
    return NetlifyResponse.json(result.rows);
  }

  // Events by campaign
  if (campaignId) {
    const result = await query(
      `SELECT *
       FROM events
       WHERE campaign_id = $1
       ORDER BY priority DESC, created_at ASC`,
      [campaignId]
    );
    return NetlifyResponse.json(result.rows);
  }

  return NetlifyResponse.json(
    { error: "id, session_id, or campaign_id required" },
    { status: 400 }
  );
}

/* -----------------------------------------------------------
   POST /api-events
   Create a new event
------------------------------------------------------------ */
async function handlePOST(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const body = await request.json();

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

  if (!description) {
    return NetlifyResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO events
      (campaign_id, session_id, description, event_type, weather,
       trigger_detail, priority, countdown_minutes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5,
            $6, $7, $8, NOW(), NOW())
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

  const event = result.rows[0];
  const eventId = event.id;

  /* -----------------------------------------
     Attach NPCs / Locations / Items
  ----------------------------------------- */

  for (const npcId of npc_ids) {
    await query(
      `INSERT INTO event_npcs (event_id, npc_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [eventId, npcId]
    );
  }

  for (const locId of location_ids) {
    await query(
      `INSERT INTO event_locations (event_id, location_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [eventId, locId]
    );
  }

  for (const itemId of item_ids) {
    await query(
      `INSERT INTO event_items (event_id, item_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [eventId, itemId]
    );
  }

  return NetlifyResponse.json(event, { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api-events?id=UUID
   Update an event
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
    SET description        = COALESCE($2, description),
        event_type         = COALESCE($3, event_type),
        weather            = COALESCE($4, weather),
        trigger_detail     = COALESCE($5, trigger_detail),
        priority           = COALESCE($6, priority),
        countdown_minutes  = COALESCE($7, countdown_minutes),
        updated_at         = NOW()
    WHERE id = $1
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

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "Event not found" },
      { status: 404 }
    );
  }

  const updated = result.rows[0];

  /* -----------------------------------------
     Replace linked tables (if provided)
  ----------------------------------------- */

  if (npc_ids) {
    await query(`DELETE FROM event_npcs WHERE event_id = $1`, [id]);
    for (const npcId of npc_ids) {
      await query(
        `INSERT INTO event_npcs (event_id, npc_id)
         VALUES ($1, $2)`,
        [id, npcId]
      );
    }
  }

  if (location_ids) {
    await query(`DELETE FROM event_locations WHERE event_id = $1`, [id]);
    for (const locId of location_ids) {
      await query(
        `INSERT INTO event_locations (event_id, location_id)
         VALUES ($1, $2)`,
        [id, locId]
      );
    }
  }

  if (item_ids) {
    await query(`DELETE FROM event_items WHERE event_id = $1`, [id]);
    for (const itemId of item_ids) {
      await query(
        `INSERT INTO event_items (event_id, item_id)
         VALUES ($1, $2)`,
        [id, itemId]
      );
    }
  }

  return NetlifyResponse.json(updated);
}

/* -----------------------------------------------------------
   DELETE /api-events?id=UUID
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

  // delete join table references automatically due to FK ON DELETE CASCADE
  const result = await query(
    `DELETE FROM events
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "Event not found" },
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
    console.error("api-events error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
