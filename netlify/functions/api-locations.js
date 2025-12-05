// netlify/functions/api-locations.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

/* -----------------------------------------------------------
   GET /api-locations
   - ?id=UUID             → fetch one location + events
   - ?event_id=UUID       → locations linked to an event
   - ?session_id=UUID     → locations used in that session’s events
   - ?campaign_id=UUID    → locations used in that campaign’s events
   - none                 → list all locations
------------------------------------------------------------ */
async function handleGET(request) {
  const id = request.query.get("id");
  const eventId = request.query.get("event_id");
  const sessionId = request.query.get("session_id");
  const campaignId = request.query.get("campaign_id");

  /* ---------------------------------------------
     GET SINGLE LOCATION + linked events
  --------------------------------------------- */
  if (id) {
    const locRes = await query(
      `SELECT *
       FROM locations
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (locRes.rows.length === 0) {
      return NetlifyResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const location = locRes.rows[0];

    // Fetch events where this location appears
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

    return NetlifyResponse.json({
      ...location,
      events,
    });
  }

  /* ---------------------------------------------
     GET LOCATIONS LINKED TO A SPECIFIC EVENT
  --------------------------------------------- */
  if (eventId) {
    const result = await query(
      `
      SELECT l.*
      FROM event_locations el
      JOIN locations l ON l.id = el.location_id
      WHERE el.event_id = $1
      ORDER BY l.description ASC
      `,
      [eventId]
    );
    return NetlifyResponse.json(result.rows);
  }

  /* ---------------------------------------------
     GET LOCATIONS USED BY A SESSION'S EVENTS
  --------------------------------------------- */
  if (sessionId) {
    const result = await query(
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
    return NetlifyResponse.json(result.rows);
  }

  /* ---------------------------------------------
     GET LOCATIONS USED BY A CAMPAIGN'S EVENTS
  --------------------------------------------- */
  if (campaignId) {
    const result = await query(
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
    return NetlifyResponse.json(result.rows);
  }

  /* ---------------------------------------------
     GET ALL LOCATIONS
  --------------------------------------------- */
  const result = await query(
    `SELECT *
     FROM locations
     ORDER BY description ASC`
  );

  return NetlifyResponse.json(result.rows);
}

/* -----------------------------------------------------------
   POST /api-locations
   Create new location
------------------------------------------------------------ */
async function handlePOST(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const body = await request.json();
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

  if (!description) {
    return NetlifyResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO locations
      (description, street, city, state, zip, notes,
       secrets, points_of_interest, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6,
            $7, $8, NOW(), NOW())
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

  return NetlifyResponse.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api-locations?id=UUID
   Update a location
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

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "Location not found" },
      { status: 404 }
    );
  }

  return NetlifyResponse.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-locations?id=UUID
   Deletes location + event links
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
    DELETE FROM locations
    WHERE id = $1
    RETURNING id
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "Location not found" },
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
    console.error("api-locations error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
