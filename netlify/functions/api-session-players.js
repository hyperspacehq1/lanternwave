// netlify/functions/api-session-players.js
import db from "../_utils/db.js";   // Must exist as a .js file

export async function handler(event) {
  try {
    const method = event.httpMethod;

    /* ------------------------------------------------------------------
       GET — List players for a session
    ------------------------------------------------------------------ */
    if (method === "GET") {
      const session_id = event.queryStringParameters?.session_id;

      if (!session_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "session_id is required" }),
        };
      }

      const { rows } = await db.query(
        `SELECT id AS player_id, session_id, phone_number, player_name
         FROM session_players
         WHERE session_id = $1
         ORDER BY id ASC`,
        [session_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ players: rows }),
      };
    }

    /* ------------------------------------------------------------------
       POST — Add a player to session
    ------------------------------------------------------------------ */
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

      const { rows } = await db.query(
        `INSERT INTO session_players (session_id, phone_number, player_name)
         VALUES ($1, $2, $3)
         RETURNING id, session_id, phone_number, player_name`,
        [session_id, phone_number, player_name || null]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ player: rows[0] }),
      };
    }

    /* ------------------------------------------------------------------
       DELETE — Remove a player
    ------------------------------------------------------------------ */
    if (method === "DELETE") {
      const { player_id } = JSON.parse(event.body || "{}");

      if (!player_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "player_id required" }),
        };
      }

      await db.query(`DELETE FROM session_players WHERE id = $1`, [
        player_id,
      ]);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    /* ------------------------------------------------------------------
       METHOD NOT ALLOWED
    ------------------------------------------------------------------ */
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  } catch (err) {
    console.error("api-session-players ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
}
