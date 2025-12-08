// netlify/functions/api-locations.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

// JSON helper
const json = (status, payload) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

/* -----------------------------------------------------------
   GET /api-locations
------------------------------------------------------------ */
async function handleGET(event) {
  const qs = event.queryStringParameters || {};
  const id = qs.id;
  const eventId = qs.event_id;
  const sessionId = qs.session_id;
  const campaignId = qs.campaign_id;

  // ────────────────────────────────
  // GET SINGLE LOCATION + linked events
  // ────────────────────────────────
  if (id) {
    const locRes = await query(
      `SELECT *
       FROM locations
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (locRes.rows.length === 0) {
      return json(404, { error: "Location not found" });
    }

    const location = locRes.rows[0];

    const events = (
      await query(
        `
        SELECT e.*
        FROM event_locations el
        JOIN events e ON e.id = el.event_id
        WHERE el.location_id = $1
        ORDER BY e.created_at ASC
        `,
        [id]
      )
    ).rows;

    return json(200, { ...location, events });
  }

  // ────────────────────────────────
  // GET LOCATIONS FOR EVENT
  // ────────────────────────────────
  if (eventId) {
    const out = await query(
      `
      SELECT l.*
      FROM event_locations el
      JOIN locations l ON l.id = el.location_id
      WHERE el.event_id = $1
      ORDER BY l.description ASC
      `,
      [eventId]
    );
    return json(200, out.rows);
  }

  // ────────────────────────────────
  // GET LOCATIONS FOR SESSION
  // ────────────────────────────────
  if (sessionId) {
    const out = await query(
      `
      SELECT DISTINCT l.*
      FROM event_locations el
      JOIN locations l ON l.id = el.location_id
      JOIN events e ON e.id = el.event_id
      WHERE e.session_id = $1
      ORDER BY l.description ASC
      `,
      [sessionId]
    );
    return json(200, out.rows);
  }

  // ────────────────────────────────
  // GET LOCATIONS FOR CAMPAIGN
  // ────────────────────────────────
  if (campaignId) {
    const out = await query(
      `
      SELECT DISTINCT l.*
      FROM event_locations el
      JOIN locations l ON l.id = el.location_id
      JOIN events e ON e.id = el.event_id
      WHERE e.campaign_id = $1
      ORDER BY l.description ASC
      `,
      [campaignId]
    );
    return json(200, out.rows);
  }

  // ────────────────────────────────
  // GET ALL LOCATIONS
  // ────────────────────────────────
  const out = await query(
    `SELECT *
     FROM locations
     ORDER BY description ASC`
  );

  return json(200, out.rows);
}

/* -----------------------------------------------------------
   POST /api-locations
------------------------------------------------------------ */
async function handlePOST(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const body = JSON.parse(event.body || "{}");

  const {
    description,
    street,
    city,
    state,
    zip,
    notes,
    secrets,
    points_of_interest,
  } = body;

  if (!description) return json(400, { error: "description is required" });

  const result = await query(
    `
    INSERT INTO locations
      (description, street, city, state, zip, notes, secrets,
       points_of_interest, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())
    RETURNING *
    `,
    [
      description,
      street || "",
      city || "",
      state || "",
      zip || "",
      notes || "",
      secrets || "",
      points_of_interest || "",
    ]
  );

  return json(201, result.rows[0]);
}

/* -----------------------------------------------------------
   PUT /api-locations?id=
------------------------------------------------------------ */
async function handlePUT(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: "id is required" });

  const body = JSON.parse(event.body || "{}");

  const {
    description,
    street,
    city,
    state,
    zip,
    notes,
    secrets,
    points_of_interest,
  } = body;

  const result = await query(
    `
    UPDATE locations
       SET description        = COALESCE($2, description),
           street             = COALESCE($3, street),
           city               = COALESCE($4, city),
           state              = COALESCE($5, state),
           zip                = COALESCE($6, zip),
           notes              = COALESCE($7, notes),
           secrets            = COALESCE($8, secrets),
           points_of_interest = COALESCE($9, points_of_interest),
           updated_at         = NOW()
     WHERE id = $1
     RETURNING *
    `,
    [
      id,
      description,
      street,
      city,
      state,
      zip,
      notes,
      secrets,
      points_of_interest,
    ]
  );

  if (result.rows.length === 0)
    return json(404, { error: "Location not found" });

  return json(200, result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-locations?id=
------------------------------------------------------------ */
async function handleDELETE(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: "id is required" });

  const result = await query(
    `DELETE FROM locations WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0)
    return json(404, { error: "Location not found" });

  return json(200, { success: true, id });
}

/* -----------------------------------------------------------
   MAIN HANDLER (Classic 2024)
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
    console.error("api-locations error:", err);
    return json(500, { error: err.message || "Internal Server Error" });
  }
};
