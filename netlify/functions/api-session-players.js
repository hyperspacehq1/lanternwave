// netlify/functions/api-session-players.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const sessionId = event.queryStringParameters.session_id;
  if (!sessionId) return badRequest("Missing session_id");

  const method = event.httpMethod;

  try {
    // GET — list players
    if (method === "GET") {
      const res = await query(`
        SELECT * FROM mission_players
        WHERE session_id=$1
        ORDER BY join_time ASC
      `, [sessionId]);

      return json(res.rows);
    }

    // POST — add player
    if (method === "POST") {
      const b = JSON.parse(event.body);

      const res = await query(`
        INSERT INTO mission_players (session_id, phone_number, player_name)
        VALUES ($1,$2,$3)
        ON CONFLICT (session_id, phone_number) DO NOTHING
        RETURNING *
      `, [sessionId, b.phone_number, b.player_name]);

      return json(res.rows[0] || { exists: true });
    }

    // DELETE — remove one player
    if (method === "DELETE") {
      const phone = event.queryStringParameters.phone;
      if (!phone) return badRequest("Missing phone");

      await query(`
        DELETE FROM mission_players
        WHERE session_id=$1 AND phone_number=$2
      `, [sessionId, phone]);

      return json({ removed: true });
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("api-session-players error:", err);
    return serverError();
  }
};

function json(d) { return { statusCode: 200, body: JSON.stringify(d) }; }
function badRequest(m) { return { statusCode: 400, body: m }; }
function serverError() { return { statusCode: 500, body: "Server Error" }; }
function methodNotAllowed() { return { statusCode: 405, body: "Method Not Allowed" }; }
