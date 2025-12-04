// netlify/functions/api-session-players.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    const method = event.httpMethod;

    /* -----------------------------------------------------------
       GET — List players for a session
    ----------------------------------------------------------- */
    if (method === "GET") {
      const session_id = event.queryStringParameters?.session_id;

      if (!session_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "session_id required" }),
        };
      }

      const result = await query(
        `SELECT
           id,
           session_id,
           phone_number,
           player_name
         FROM session_players
         WHERE session_id = $1
         ORDER BY id ASC`,
        [session_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    }

    /* -----------------------------------------------------------
       POST — Add a player
    ----------------------------------------------------------- */
    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");

      const { session_id, phone_number, player_name } = body;

      if (!session_id || !phone_number) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "session_id and phone_number required",
          }),
        };
      }

      const result = await query(
        `INSERT INTO session_players
           (session_id, phone_number, player_name)
         VALUES ($1, $2, $3)
         RETURNING id, session_id, phone_number, player_name`,
        [session_id, phone_number, player_name || null]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ player: result.rows[0] }),
      };
    }

    /* -----------------------------------------------------------
       DELETE — Remove a player
    ----------------------------------------------------------- */
    if (method === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const { player_id } = body;

      if (!player_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "player_id required" }),
        };
      }

      await query(
        `DELETE FROM session_players
         WHERE id = $1`,
        [player_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    /* -----------------------------------------------------------
       METHOD NOT ALLOWED
    ----------------------------------------------------------- */
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  } catch (err) {
    console.error("api-session-players ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
