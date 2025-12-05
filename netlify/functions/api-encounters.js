// netlify/functions/api-encounters.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

/* -----------------------------------------------------------
   GET /api-encounters
   - ?id=UUID          → get one encounter + linked lore/locations/items
   - ?session_id=UUID  → list encounters for a session
   - ?campaign_id=UUID → list encounters for a campaign
   - none              → list all encounters
------------------------------------------------------------ */
async function handleGET(request) {
  const id = request.query.get("id");
  const sessionId = request.query.get("session_id");
  const campaignId = request.query.get("campaign_id");

  /* ---------------------------------------------
     GET SINGLE ENCOUNTER
  --------------------------------------------- */
  if (id) {
    const encRes = await query(
      `SELECT *
       FROM encounters
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (encRes.rows.length === 0) {
      return NetlifyResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    const encounter = encRes.rows[0];

    // Linked lore
    const lore = (
      await query(
        `
        SELECT l.*
        FROM encounter_lore el
        JOIN lore l ON l.id = el.lore_id
        WHERE el.encounter_id = $1
        ORDER BY l.description ASC
        `,
        [id]
      )
    ).rows;

    // Linked locations
    const locations = (
      await query(
        `
        SELECT loc.*
        FROM encounter_locations el
        JOIN locations loc ON loc.id = el.location_id
        WHERE el.encounter_id = $1
        ORDER BY loc.description ASC
        `,
        [id]
      )
    ).rows;

    // Linked items
    const items = (
      await query(
        `
        SELECT i.*
        FROM encounter_items ei
        JOIN items i ON i.id = ei.item_id
        WHERE ei.encounter_id = $1
        ORDER BY i.description ASC
        `,
        [id]
      )
    ).rows;

    return NetlifyResponse.json({
      ...encounter,
      lore,
      locations,
      items,
    });
  }

  /* ---------------------------------------------
     GET ENCOUNTERS BY SESSION
  --------------------------------------------- */
  if (sessionId) {
    const result = await query(
      `
      SELECT *
      FROM encounters
      WHERE session_id = $1
      ORDER BY priority DESC, created_at ASC
      `,
      [sessionId]
    );
    return NetlifyResponse.json(result.rows);
  }

  /* ---------------------------------------------
     GET ENCOUNTERS BY CAMPAIGN
  --------------------------------------------- */
  if (campaignId) {
    const result = await query(
      `
      SELECT *
      FROM encounters
      WHERE campaign_id = $1
      ORDER BY priority DESC, created_at ASC
      `,
      [campaignId]
    );
    return NetlifyResponse.json(result.rows);
  }

  /* ---------------------------------------------
     GET ALL ENCOUNTERS
  --------------------------------------------- */
  const result = await query(
    `
    SELECT *
    FROM encounters
    ORDER BY created_at DESC
    `
  );

  return NetlifyResponse.json(result.rows);
}

/* -----------------------------------------------------------
   POST /api-encounters
   Create a new encounter
------------------------------------------------------------ */
async function handlePOST(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const body = await request.json();

  const {
    campaign_id,
    session_id,
    description,
    notes,
    priority = 1,
    lore_ids = [],
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
    INSERT INTO encounters
      (campaign_id, session_id, description, notes, priority,
       created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5,
            NOW(), NOW())
    RETURNING *
    `,
    [
      campaign_id || null,
      session_id || null,
      description,
      notes || "",
      priority,
    ]
  );

  const encounter = result.rows[0];
  const encounterId = encounter.id;

  /* ---------------------------------------------
     Link Lore / Locations / Items
  --------------------------------------------- */
  for (const loreId of lore_ids) {
    await query(
      `
      INSERT INTO encounter_lore (encounter_id, lore_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [encounterId, loreId]
    );
  }

  for (const locId of location_ids) {
    await query(
      `
      INSERT INTO encounter_locations (encounter_id, location_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [encounterId, locId]
    );
  }

  for (const itemId of item_ids) {
    await query(
      `
      INSERT INTO encounter_items (encounter_id, item_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [encounterId, itemId]
    );
  }

  return NetlifyResponse.json(encounter, { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api-encounters?id=UUID
   Update an encounter
------------------------------------------------------------ */
async function handlePUT(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const id = request.query.get("id");
  if (!id) {
    return NetlifyResponse.json({ error: "id is required" }, { status: 400 });
  }

  const body = await request.json();

  const {
    description,
    notes,
    priority,
    lore_ids,
    location_ids,
    item_ids,
  } = body;

  const result = await query(
    `
    UPDATE encounters
    SET description = COALESCE($2, description),
        notes       = COALESCE($3, notes),
        priority    = COALESCE($4, priority),
        updated_at  = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [id, description, notes, priority]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json({ error: "Encounter not found" }, { status: 404 });
  }

  const updated = result.rows[0];

  /* ---------------------------------------------
     Replace link tables (if provided)
  --------------------------------------------- */
  if (lore_ids) {
    await query(`DELETE FROM encounter_lore WHERE encounter_id = $1`, [id]);
    for (const loreId of lore_ids) {
      await query(
        `INSERT INTO encounter_lore (encounter_id, lore_id)
         VALUES ($1, $2)`,
        [id, loreId]
      );
    }
  }

  if (location_ids) {
    await query(`DELETE FROM encounter_locations WHERE encounter_id = $1`, [id]);
    for (const locId of location_ids) {
      await query(
        `INSERT INTO encounter_locations (encounter_id, location_id)
         VALUES ($1, $2)`,
        [id, locId]
      );
    }
  }

  if (item_ids) {
    await query(`DELETE FROM encounter_items WHERE encounter_id = $1`, [id]);
    for (const itemId of item_ids) {
      await query(
        `INSERT INTO encounter_items (encounter_id, item_id)
         VALUES ($1, $2)`,
        [id, itemId]
      );
    }
  }

  return NetlifyResponse.json(updated);
}

/* -----------------------------------------------------------
   DELETE /api-encounters?id=UUID
   Deletes encounter + its link-table associations
------------------------------------------------------------ */
async function handleDELETE(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const id = request.query.get("id");
  if (!id) {
    return NetlifyResponse.json({ error: "id is required" }, { status: 400 });
  }

  const result = await query(
    `
    DELETE FROM encounters
    WHERE id = $1
    RETURNING id
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json({ error: "Encounter not found" }, { status: 404 });
  }

  return NetlifyResponse.json({ success: true, id });
}

/* -----------------------------------------------------------
   MAIN HANDLER — Netlify 2025
------------------------------------------------------------ */
export default async function handler(request) {
  try {
    switch (request.method) {
      case "GET": return await handleGET(request);
      case "POST": return await handlePOST(request);
      case "PUT":
      case "PATCH": return await handlePUT(request);
      case "DELETE": return await handleDELETE(request);

      default:
        return NetlifyResponse.json({ error: "Method Not Allowed" }, { status: 405 });
    }
  } catch (err) {
    console.error("api-encounters error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
