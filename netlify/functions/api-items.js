// netlify/functions/api-items.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

/* -----------------------------------------------------------
   GET /api-items
   - ?id=UUID             → fetch one item
   - ?event_id=UUID       → items attached to an event
   - none                 → list all items
------------------------------------------------------------ */
async function handleGET(request) {
  const id = request.query.get("id");
  const eventId = request.query.get("event_id");

  /* ---------------------------------------------
     GET SINGLE ITEM + linked events
  --------------------------------------------- */
  if (id) {
    const itemRes = await query(
      `SELECT *
         FROM items
         WHERE id = $1
         LIMIT 1`,
      [id]
    );

    if (itemRes.rows.length === 0) {
      return NetlifyResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    const item = itemRes.rows[0];

    // Also return the events this item is used in
    const events = (
      await query(
        `
        SELECT e.*
        FROM event_items ei
        JOIN events e ON e.id = ei.event_id
        WHERE ei.item_id = $1
        ORDER BY e.created_at ASC
        `,
        [id]
      )
    ).rows;

    return NetlifyResponse.json({
      ...item,
      events,
    });
  }

  /* ---------------------------------------------
     GET ITEMS LINKED TO AN EVENT
  --------------------------------------------- */
  if (eventId) {
    const result = await query(
      `
      SELECT items.*
      FROM event_items ei
      JOIN items ON items.id = ei.item_id
      WHERE ei.event_id = $1
      ORDER BY items.description ASC
      `,
      [eventId]
    );

    return NetlifyResponse.json(result.rows);
  }

  /* ---------------------------------------------
     GET ALL ITEMS
  --------------------------------------------- */
  const result = await query(
    `SELECT *
     FROM items
     ORDER BY description ASC`
  );

  return NetlifyResponse.json(result.rows);
}

/* -----------------------------------------------------------
   POST /api-items
   Create new item
------------------------------------------------------------ */
async function handlePOST(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { description, notes } = body;

  if (!description) {
    return NetlifyResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO items
      (description, notes, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    RETURNING *
    `,
    [description, notes || ""]
  );

  return NetlifyResponse.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api-items?id=UUID
   Update item
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
  const { description, notes } = body;

  const result = await query(
    `
    UPDATE items
    SET description = COALESCE($2, description),
        notes       = COALESCE($3, notes),
        updated_at  = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [id, description, notes]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "Item not found" },
      { status: 404 }
    );
  }

  return NetlifyResponse.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-items?id=UUID
   Deletes item + event links
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

  // Cascades cleanly if FK uses ON DELETE CASCADE
  const result = await query(
    `DELETE FROM items
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "Item not found" },
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
    console.error("api-items error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
