// netlify/functions/api-session-players.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export const handler = async (event) => {
  const { ok, response } = requireAdmin(event.headers || {});
  if (!ok) return response;

  const params = event.queryStringParameters || {};
  const sessionId = params.session_id ? Number(params.session_id) : null;

  if (!sessionId || sessionId < 1) {
    return json(400, { error: "Valid session_id is required." });
  }

  try {
    if (event.httpMethod === "GET") {
      const res = await query(
        `SELECT id, session_id, phone_number, player_name
         FROM session_players
         WHERE session_id = $1
         ORDER BY id ASC`,
        [sessionId]
      );
      return json(200, res.rows || []);
    }

    if (event.httpMethod === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};
      const { phone_number, player_name = "" } = body;

      if (!phone_number) {
        return json(400, { error: "phone_number is required." });
      }

      // Manual upsert: check if exists
      const existing = await query(
        `SELECT id FROM session_players
         WHERE session_id = $1 AND phone_number = $2`,
        [sessionId, phone_number]
      );

      let row;
      if (existing.rows.length > 0) {
        const updRes = await query(
          `UPDATE session_players
           SET player_name = $1
           WHERE id = $2
           RETURNING *`,
          [player_name, existing.rows[0].id]
        );
        row = updRes.rows[0];
      } else {
        const insRes = await query(
          `INSERT INTO session_players (session_id, phone_number, player_name)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [sessionId, phone_number, player_name]
        );
        row = insRes.rows[0];
      }

      return json(200, row);
    }

    if (event.httpMethod === "DELETE") {
      const phone = params.phone;
      if (!phone) {
        return json(400, { error: "phone query parameter is required for delete." });
      }

      const delRes = await query(
        `DELETE FROM session_players
         WHERE session_id = $1 AND phone_number = $2`,
        [sessionId, phone]
      );

      return json(200, { deleted: delRes.rowCount || 0 });
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("api-session-players error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
