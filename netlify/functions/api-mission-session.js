import { query } from "../util/db.js";

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export const handler = async (event) => {
  const qs = event.queryStringParameters || {};

  try {
    if (event.httpMethod === "GET") {
      const { id, players } = qs;

      if (!id) {
        return json(400, { error: "id (session_id) is required" });
      }

      if (players) {
        const r = await query(
          `SELECT id, session_id, phone_number, player_name
           FROM session_players
           WHERE session_id=$1
           ORDER BY player_name NULLS LAST, phone_number`,
          [id]
        );
        return json(200, r.rows);
      }

      const r = await query(
        "SELECT * FROM mission_sessions WHERE id=$1",
        [id]
      );
      if (r.rows.length === 0) {
        return json(404, { error: "Session not found" });
      }
      return json(200, r.rows[0]);
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { session_id, player_name, phone_number } = body;

      if (!session_id || !phone_number) {
        return json(400, {
          error: "session_id and phone_number are required",
        });
      }

      const r = await query(
        `INSERT INTO session_players (session_id, phone_number, player_name)
         VALUES ($1,$2,$3)
         ON CONFLICT (session_id, phone_number)
         DO UPDATE SET player_name = COALESCE(EXCLUDED.player_name, session_players.player_name)
         RETURNING *`,
        [session_id, phone_number, player_name || null]
      );

      return json(200, r.rows[0]);
    }

    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const { session_id, phone_number } = body;

      if (!session_id || !phone_number) {
        return json(400, {
          error: "session_id and phone_number are required",
        });
      }

      await query(
        `DELETE FROM session_players
         WHERE session_id=$1 AND phone_number=$2`,
        [session_id, phone_number]
      );

      return json(200, { success: true });
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("api-mission-session error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
