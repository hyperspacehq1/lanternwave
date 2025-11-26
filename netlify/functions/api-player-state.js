// netlify/functions/api-player-state.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const sessionId = event.queryStringParameters.session_id;
  const phone = event.queryStringParameters.phone;

  if (!sessionId || !phone)
    return badRequest("Missing session_id or phone");

  const method = event.httpMethod;

  try {
    // GET — fetch player state
    if (method === "GET") {
      const res = await query(`
        SELECT * FROM mission_player_state
        WHERE session_id=$1 AND phone_number=$2
      `, [sessionId, phone]);

      return json(res.rows[0] || {});
    }

    // POST — update player state
    if (method === "POST") {
      const b = JSON.parse(event.body);

      const res = await query(`
        INSERT INTO mission_player_state
        (session_id, phone_number, progress_flags, discovered_clues)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (session_id, phone_number)
        DO UPDATE SET
          progress_flags = EXCLUDED.progress_flags,
          discovered_clues = EXCLUDED.discovered_clues,
          last_update = NOW()
        RETURNING *
      `, [
        sessionId,
        phone,
        b.progress_flags || {},
        b.discovered_clues || []
      ]);

      return json(res.rows[0]);
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("api-player-state error:", err);
    return serverError();
  }
};

function json(d) { return { statusCode: 200, body: JSON.stringify(d) }; }
function badRequest(m) { return { statusCode: 400, body: m }; }
function serverError() { return { statusCode: 500, body: "Server Error" }; }
function methodNotAllowed() { return { statusCode: 405, body: "Method Not Allowed" }; }
