// netlify/functions/api-lore.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

/* -----------------------------------------------------------
   GET /api-lore
   - ?id=UUID           → fetch one lore record + linked encounters
   - ?encounter_id=UUID → lore entries linked to that encounter
   - none               → list all lore
------------------------------------------------------------ */
async function handleGET(request) {
  const id = request.query.get("id");
  const encounterId = request.query.get("encounter_id");

  /* ---------------------------------------------
     GET ONE LORE ITEM + linked encounters
  --------------------------------------------- */
  if (id) {
    const loreRes = await query(
      `SELECT *
       FROM lore
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (loreRes.rows.length === 0) {
      return NetlifyResponse.json(
        { error: "Lore not found" },
        { status: 404 }
      );
    }

    const loreItem = loreRes.rows[0];

    // get encounters associated with this lore
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

    return NetlifyResponse.json({
      ...loreItem,
      encounters,
    });
  }

  /* ---------------------------------------------
     GET LORE FOR A SPECIFIC ENCOUNTER
  --------------------------------------------- */
  if (encounterId) {
    const result = await query(
      `
      SELECT l.*
      FROM encounter_lore el
      JOIN lore l ON l.id = el.lore_id
      WHERE el.encounter_id = $1
      ORDER BY l.description ASC
      `,
      [encounterId]
    );

    return NetlifyResponse.json(result.rows);
  }

  /* ---------------------------------------------
     GET ALL LORE
  --------------------------------------------- */
  const result = await query(
    `SELECT *
     FROM lore
     ORDER BY description ASC`
  );

  return NetlifyResponse.json(result.rows);
}

/* -----------------------------------------------------------
   POST /api-lore
   Create new lore entry
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
    INSERT INTO lore
      (description, notes, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    RETURNING *
    `,
    [description, notes || ""]
  );

  return NetlifyResponse.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api-lore?id=UUID
   Update lore item
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
    UPDATE lore
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
      { error: "Lore not found" },
      { status: 404 }
    );
  }

  return NetlifyResponse.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-lore?id=UUID
   Deletes lore entry + encounter links
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

  const result = await query(
    `
    DELETE FROM lore
    WHERE id = $1
    RETURNING id
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "Lore not found" },
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
      case "GET":    return await handleGET(request);
      case "POST":   return await handlePOST(request);
      case "PUT":
      case "PATCH":  return await handlePUT(request);
      case "DELETE": return await handleDELETE(request);

      default:
        return NetlifyResponse.json(
          { error: "Method Not Allowed" },
          { status: 405 }
        );
    }
  } catch (err) {
    console.error("api-lore error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
