// netlify/functions/api-sessions.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

/* -----------------------------------------------------------
   GET /api-sessions
   - List all sessions for a campaign → ?campaign_id=UUID
   - OR get a single session → ?id=UUID
------------------------------------------------------------ */
async function handleGET(request) {
  const id = request.query.get("id");
  const campaignId = request.query.get("campaign_id");

  // Fetch single session
  if (id) {
    const result = await query(
      `SELECT *
       FROM sessions
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NetlifyResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NetlifyResponse.json(result.rows[0]);
  }

  // Fetch all sessions for a campaign
  if (campaignId) {
    const result = await query(
      `SELECT *
       FROM sessions
       WHERE campaign_id = $1
       ORDER BY created_at ASC`,
      [campaignId]
    );

    return NetlifyResponse.json(result.rows);
  }

  return NetlifyResponse.json(
    { error: "Either id or campaign_id is required" },
    { status: 400 }
  );
}

/* -----------------------------------------------------------
   POST /api-sessions
   Create a new session
------------------------------------------------------------ */
async function handlePOST(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const {
    campaign_id,
    description,
    geography,
    notes,
    history
  } = body;

  if (!campaign_id) {
    return NetlifyResponse.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  if (!description) {
    return NetlifyResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

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

  return NetlifyResponse.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api-sessions?id=UUID
   Update an existing session
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
    geography,
    notes,
    history
  } = body;

  const result = await query(
    `
    UPDATE sessions
    SET description   = COALESCE($2, description),
        geography     = COALESCE($3, geography),
        notes         = COALESCE($4, notes),
        history       = COALESCE($5, history),
        updated_at    = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [id, description, geography, notes, history]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  return NetlifyResponse.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-sessions?id=UUID
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
    `DELETE FROM sessions WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "Session not found" },
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
    console.error("api-sessions error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
