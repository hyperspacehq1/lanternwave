// netlify/functions/api-events.js

import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    /* ---------------- GET EVENTS FOR A MISSION ---------------- */
    if (event.httpMethod === "GET") {
      const mission_id = event.queryStringParameters?.mission_id;
      if (!mission_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "mission_id required" }),
        };
      }

      const result = await query(
        `SELECT id, mission_id, event_type, payload, archived, created_at
         FROM mission_events
         WHERE mission_id = $1 AND archived = false
         ORDER BY created_at ASC`,
        [mission_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ events: result.rows }),
      };
    }

    /* ---------------- CREATE EVENT (MISSION-SCOPED) ---------------- */
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const { mission_id, event_type, payload } = body;
      if (!mission_id || !event_type) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "mission_id and event_type required",
          }),
        };
      }

      const result = await query(
        `INSERT INTO mission_events
         (mission_id, event_type, payload, archived, created_at)
         VALUES ($1, $2, $3, false, NOW())
         RETURNING *`,
        [mission_id, event_type, payload]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ event: result.rows[0] }),
      };
    }

    /* ---------------- ARCHIVE EVENT ---------------- */
    if (event.httpMethod === "DELETE") {
      const { mission_id, event_id } = event.queryStringParameters;

      if (!mission_id || !event_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "mission_id and event_id required",
          }),
        };
      }

      await query(
        `UPDATE mission_events
         SET archived = true
         WHERE id = $1 AND mission_id = $2`,
        [event_id, mission_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ archived: true }),
      };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("API EVENTS ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
