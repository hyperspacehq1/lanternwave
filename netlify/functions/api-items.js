// netlify/functions/api-items.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

const json = (status, payload) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

/* -----------------------------------------------------------
   GET /api-items
------------------------------------------------------------ */
async function handleGET(event) {
  const qs = event.queryStringParameters || {};
  const id = qs.id;
  const eventId = qs.event_id;

  // ───────────────────────────────
  // GET ONE ITEM + linked events
  // ───────────────────────────────
  if (id) {
    const itemRes = await query(
      `SELECT * FROM items WHERE id=$1 LIMIT 1`,
      [id]
    );

    if (itemRes.rows.length === 0)
      return json(404, { error: "Item not found" });

    const item = itemRes.rows[0];

    const events = (
      await query(
        `
        SELECT e.*
        FROM event_items ei
        JOIN events e ON e.id = ei.event_id
        WHERE ei.item_id=$1
        ORDER BY e.created_at ASC
        `,
        [id]
      )
    ).rows;

    return json(200, { ...item, events });
  }

  // ───────────────────────────────
  // GET ITEMS FOR EVENT
  // ───────────────────────────────
  if (eventId) {
    const out = await query(
      `
      SELECT items.*
      FROM event_items ei
      JOIN items ON items.id = ei.item_id
      WHERE ei.event_id=$1
      ORDER BY items.description ASC
      `,
      [eventId]
    );
    return json(200, out.rows);
  }

  // ───────────────────────────────
  // GET ALL ITEMS
  // ───────────────────────────────
  const out = await query(
    `SELECT * FROM items ORDER BY description ASC`
  );

  return json(200, out.rows);
}

/* -----------------------------------------------------------
   POST /api-items
------------------------------------------------------------ */
async function handlePOST(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const body = JSON.parse(event.body || "{}");

  const { description, notes } = body;

  if (!description)
    return json(400, { error: "description is required" });

  const result = await query(
    `
    INSERT INTO items
      (description, notes, created_at, updated_at)
    VALUES ($1,$2, NOW(), NOW())
    RETURNING *
    `,
    [description, notes || ""]
  );

  return json(201, result.rows[0]);
}

/* -----------------------------------------------------------
   PUT /api-items?id=
------------------------------------------------------------ */
async function handlePUT(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: "id is required" });

  const body = JSON.parse(event.body || "{}");

  const { description, notes } = body;

  const result = await query(
    `
    UPDATE items
       SET description = COALESCE($2, description),
           notes       = COALESCE($3, notes),
           updated_at  = NOW()
     WHERE id=$1
     RETURNING *
    `,
    [id, description, notes]
  );

  if (result.rows.length === 0)
    return json(404, { error: "Item not found" });

  return json(200, result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-items?id=
------------------------------------------------------------ */
async function handleDELETE(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: "id is required" });

  const result = await query(
    `DELETE FROM items WHERE id=$1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0)
    return json(404, { error: "Item not found" });

  return json(200, { success: true, id });
}

/* -----------------------------------------------------------
   MAIN HANDLER
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
    console.error("api-items error:", err);
    return json(500, { error: err.message || "Internal Server Error" });
  }
};
