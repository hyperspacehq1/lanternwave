// netlify/functions/api-events.js
// 2025-compatible Mission Event API
// FIXED to use mission_id (NOT session_id)

import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    // ------------------------------------------------------------
    // GET  /api-events?mission_id=#
    // ------------------------------------------------------------
    if (event.httpMethod === "GET") {
      const mission_id = event.queryStringParameters?.mission_id;

      if (!mission_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "mission_id is required" }),
        };
      }

      const result = await query(
        `SELECT *
         FROM mission_events
         WHERE mission_id = $1
           AND archived = false
         ORDER BY created_at DESC`,
        [mission_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ events: result.rows }),
      };
    }

    // ------------------------------------------------------------
    // POST  /api-events  (Create an Event)
    // ------------------------------------------------------------
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const mission_id = body.mission_id;
      const event_type = body.event_type;

      if (!mission_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "mission_id is required" }),
        };
      }

      if (!event_type || !event_type.trim()) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "event_type is required" }),
        };
      }

      // Build payload JSON from UI-provided fields
      const payload = {
        location: body.location || null,
        description: body.description || null,
        goal: body.goal || null,
        item: body.item || null,
      };

      const result = await query(
        `INSERT INTO mission_events
           (mission_id, event_type, payload)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [mission_id, event_type.trim(), payload]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ event: result.rows[0] }),
      };
    }

    // ------------------------------------------------------------
    // DELETE /api-events?id=#
    // Marks event archived = true
    // ------------------------------------------------------------
    if (event.httpMethod === "DELETE") {
      const id = event.queryStringParameters?.id;

      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "id is required to archive event" }),
        };
      }

      const result = await query(
        `UPDATE mission_events
         SET archived = true
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ archived: result.rows[0] }),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  } catch (err) {
    console.error("api-events ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
