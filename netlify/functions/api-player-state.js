// netlify/functions/api-player-state.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    /* ---------------------- GET Player Session State ---------------------- */
    if (event.httpMethod === "GET") {
      const sessionId = event.queryStringParameters?.session_id;
      const phoneNumber = event.queryStringParameters?.phone_number;

      if (!sessionId || !phoneNumber) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "session_id and phone_number are required",
          }),
        };
      }

      const result = await query(
        `SELECT *
         FROM mission_player_state
         WHERE session_id = $1 AND phone_number = $2`,
        [sessionId, phoneNumber]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows[0] || null),
      };
    }

    /* ---------------------- POST (update player state) ---------------------- */
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { session_id, phone_number, progress_flags, discovered_clues } =
        body;

      if (!session_id || !phone_number) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "session_id and phone_number are required",
          }),
        };
      }

      const result = await query(
        `INSERT INTO mission_player_state
           (session_id, phone_number, progress_flags, discovered_clues, last_update)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (session_id, phone_number)
         DO UPDATE SET
           progress_flags = EXCLUDED.progress_flags,
           discovered_clues = EXCLUDED.discovered_clues,
           last_update = NOW()
         RETURNING *`,
        [
          session_id,
          phone_number,
          progress_flags || {},
          discovered_clues || {},
        ]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows[0]),
      };
    }

    /* ---------------------- Method Not Allowed ---------------------- */
    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-player-state error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
