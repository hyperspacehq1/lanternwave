// netlify/functions/api-sessions.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

const json = (status, payload) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

/* -----------------------------------------------------------
   GET /api-sessions
   Supports:
   - ?id=UUID
   - ?campaign_id=UUID
------------------------------------------------------------ */
async function handleGET(event) {
  const id = event.queryStringParameters?.id;
  const campaignId = event.queryStringParameters?.campaign_id;

  // Single session
  if (id) {
    const result = await query(
      `SELECT *
       FROM sessions
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return json(404, { error: "Session not found" });
    }

    return json(200, result.rows[0]);
  }

  // All sessions for campaign
  if (campaignId) {
    const result = await query(
      `SELECT *
       FROM sessions
       WHERE campaign_id = $1
       ORDER BY created_at ASC`,
      [campaignId]
    );

    return json(200, result.rows);
  }

  return json(400, { error: "Either id or campaign_id is required" });
}

/* -----------------------------------------------------------
   POST /api-sessions
------------------------------------------------------------ */
async function handlePOST(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const body = JSON.parse(event.body || "{}");

  const {
    campaign_id,
    description,
    geography,
    notes,
    history
  } = body;

  if (!campaign_id) return json(400, { error: "campaign_id is required" });
  if (!description) return json(400, { error: "description is required" });

  const result = await query(
    `
    INSERT INTO sessions
      (campaign_id, description, geography, notes, history, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
    `,
    [
      campaign_id,
      description,
      geography || "",
      notes || "",
      history || ""
    ]
  );

  return json(201, result.rows[0]);
}

/* -----------------------------------------------------------
   PUT /api-sessions?id=UUID
------------------------------------------------------------ */
async function handlePUT(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = event.queryStringParameters?.id;
  if (!id) return json(400, { error: "id is required" });

  const body = JSON.parse(event.body || "{}");

  const { description, geography, notes, history } = body;

  const result = await query(
    `
    UPDATE sessions
       SET description = COALESCE($2, description),
           geography   = COALESCE($3, geography),
           notes       = COALESCE($4, notes),
           history     = COALESCE($5, history),
           updated_at  = NOW()
     WHERE id = $1
     RETURNING *
    `,
    [id, description, geography, notes, history]
  );

  if (result.rows.length === 0) {
    return json(404, { error: "Session not found" });
  }

  return json(200, result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-sessions?id=UUID
------------------------------------------------------------ */
async function handleDELETE(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = event.queryStringParameters?.id;
  if (!id) return json(400, { error: "id is required" });

  const result = await query(
    `DELETE FROM sessions WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return json(404, { error: "Session not found" });
  }

  return json(200, { success: true, id });
}

/* -----------------------------------------------------------
   MAIN HANDLER
------------------------------------------------------------ */
export const handler = async (event, context) => {
  try {
    switch (event.httpMethod) {
      case "GET":
        return await handleGET(event);

      case "POST":
        return await handlePOST(event);

      case "PUT":
      case "PATCH":
        return await handlePUT(event);

      case "DELETE":
        return await handleDELETE(event);

      default:
        return json(405, { error: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("api-sessions error:", err);
    return json(500, { error: err.message || "Internal Server Error" });
  }
};
