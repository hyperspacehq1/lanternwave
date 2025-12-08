// netlify/functions/api-lore.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

const json = (status, payload) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

/* -----------------------------------------------------------
   GET /api-lore
------------------------------------------------------------ */
async function handleGET(event) {
  const qs = event.queryStringParameters || {};
  const id = qs.id;
  const encounterId = qs.encounter_id;

  // ────────────────────────────────
  // GET ONE LORE + linked encounters
  // ────────────────────────────────
  if (id) {
    const loreRes = await query(
      `SELECT * FROM lore WHERE id=$1 LIMIT 1`,
      [id]
    );

    if (loreRes.rows.length === 0)
      return json(404, { error: "Lore not found" });

    const loreItem = loreRes.rows[0];

    const encounters = (
      await query(
        `
        SELECT e.*
        FROM encounter_lore el
        JOIN encounters e ON e.id = el.encounter_id
        WHERE el.lore_id = $1
        ORDER BY e.created_at ASC
        `,
        [id]
      )
    ).rows;

    return json(200, { ...loreItem, encounters });
  }

  // ────────────────────────────────
  // GET LORE FOR A SPECIFIC ENCOUNTER
  // ────────────────────────────────
  if (encounterId) {
    const out = await query(
      `
      SELECT l.*
      FROM encounter_lore el
      JOIN lore l ON l.id = el.lore_id
      WHERE el.encounter_id=$1
      ORDER BY l.description ASC
      `,
      [encounterId]
    );

    return json(200, out.rows);
  }

  // ────────────────────────────────
  // GET ALL LORE
  // ────────────────────────────────
  const out = await query(
    `SELECT *
     FROM lore
     ORDER BY description ASC`
  );

  return json(200, out.rows);
}

/* -----------------------------------------------------------
   POST /api-lore
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
    INSERT INTO lore
      (description, notes, created_at, updated_at)
    VALUES ($1,$2, NOW(), NOW())
    RETURNING *
    `,
    [description, notes || ""]
  );

  return json(201, result.rows[0]);
}

/* -----------------------------------------------------------
   PUT /api-lore?id=
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
    UPDATE lore
       SET description = COALESCE($2, description),
           notes       = COALESCE($3, notes),
           updated_at  = NOW()
     WHERE id = $1
     RETURNING *
    `,
    [id, description, notes]
  );

  if (result.rows.length === 0)
    return json(404, { error: "Lore not found" });

  return json(200, result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-lore?id=
------------------------------------------------------------ */
async function handleDELETE(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: "id is required" });

  const result = await query(
    `DELETE FROM lore WHERE id=$1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0)
    return json(404, { error: "Lore not found" });

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
    console.error("api-lore error:", err);
    return json(500, { error: err.message || "Internal Server Error" });
  }
};
