// netlify/functions/api-mission-messages.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    /* ---------------------- GET Session Messages ---------------------- */
    if (event.httpMethod === "GET") {
      const sessionId = event.queryStringParameters?.session_id;

      if (!sessionId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "session_id is required" }),
        };
      }

      const result = await query(
        `SELECT id, session_id, sender, message, created_at
         FROM messages
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [sessionId]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    }

    /* ---------------------- POST New Message ---------------------- */
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { session_id, sender, message } = body;

      if (!session_id || !sender || !message) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "session_id, sender, and message are required",
          }),
        };
      }

      const result = await query(
        `INSERT INTO messages (session_id, sender, message, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [session_id, sender, message]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows[0]),
      };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("api-mission-messages error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
