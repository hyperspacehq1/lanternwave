// netlify/functions/api-session-players.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const sessionId = event.queryStringParameters?.session_id;

    if (!sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "session_id is required" }),
      };
    }

    // Query all players tied to this session
    const result = await query(
      `SELECT phone_number, progress_flags, discovered_clues, last_update
       FROM mission_player_state
       WHERE session_id = $1
       ORDER BY last_update DESC`,
      [sessionId]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ players: result.rows }),
    };

  } catch (err) {
    console.error("api-session-players error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
