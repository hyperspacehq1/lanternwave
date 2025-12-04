// netlify/functions/api-session-players.js

import db from "../util/db.js";   // Correct path + ESM

export async function handler(event) {
  try {
    const method = event.httpMethod;

    /* =====================================================
       GET — List players for a session
    ===================================================== */
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

    /* =====================================================
       POST — Add player to a session
    ===================================================== */
    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { session_id, phone_number, player_name } = body;

      if (!session_id || !phone_number) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "session_id and phone_number are required",
          }),
        };
      }

      const { rows } = await db.query(
        `INSERT INTO session_players (session_id, phone_number, player_name)
         VALUES ($1, $2, $3)
         RETURNING id AS player_id, session_id, phone_number, player_name`,
        [session_id, phone_number, player_name || null]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ player: rows[0] }),
      };
    }

    /* =====================================================
       DELETE — Remove a player
    ===================================================== */
    if (method === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const { player_id } = body;

      if (!player_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "player_id is required" }),
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

    /* =====================================================
       DEFAULT — Method not allowed
    ===================================================== */
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  } catch (err) {
    console.error("api-session-players ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
