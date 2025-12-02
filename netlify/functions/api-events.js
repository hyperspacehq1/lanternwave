// netlify/functions/api-events.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    /* ---------------------- GET (list events) ---------------------- */
    if (event.httpMethod === "GET") {
      const sessionId = event.queryStringParameters?.session_id;

      if (!sessionId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "session_id is required" }),
        };
      }

      const result = await query(
        `SELECT *
         FROM mission_events
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [sessionId]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    }

    /* ---------------------- POST (create event) ---------------------- */
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { session_id, event_type, payload } = body;

      if (!session_id || !event_type) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "session_id and event_type are required",
          }),
        };
      }

      const result = await query(
        `
        INSERT INTO mission_events
           (session_id, event_type, payload, created_at, archived)
         VALUES ($1, $2, $3, NOW(), false)
         RETURNING *
        `,
        [session_id, event_type, payload || {}]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows[0]),
      };
    }

    /* ---------------------- Method Not Allowed ---------------------- */
    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-events error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
