// netlify/functions/api-mission-messages.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    /* ---------------------- GET Messages (Mission Scoped) ---------------------- */
    if (event.httpMethod === "GET") {
      const missionId = event.queryStringParameters?.mission_id;

      if (!missionId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "mission_id is required" }),
        };
      }

      const result = await query(
        `SELECT id, mission_id, phone_number, body, is_from_player, created_at
         FROM messages
         WHERE mission_id = $1
         ORDER BY created_at ASC`,
        [missionId]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    }

    /* ---------------------- POST New Message ---------------------- */
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { mission_id, phone_number, text, is_from_player } = body;

      if (!mission_id || !phone_number || !text) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "mission_id, phone_number, and text are required",
          }),
        };
      }

      const result = await query(
        `INSERT INTO messages (mission_id, phone_number, body, is_from_player, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [mission_id, phone_number, text, !!is_from_player]
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
