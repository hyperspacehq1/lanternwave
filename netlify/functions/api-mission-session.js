// netlify/functions/api-mission-session.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const sessionId = event.queryStringParameters.id;
  if (!sessionId) return badRequest("Missing session id");

  const method = event.httpMethod;

  try {
    // GET — session details + mission name
    if (method === "GET") {
      const res = await query(`
        SELECT ms.*, m.name AS mission_name
        FROM mission_sessions ms
        JOIN missions m ON m.id = ms.mission_id
        WHERE ms.id = $1
      `, [sessionId]);

      return json(res.rows[0]);
    }

    // PUT — update session
    if (method === "PUT") {
      const b = JSON.parse(event.body);

      const res = await query(`
        UPDATE mission_sessions SET
          session_name = $1,
          gm_notes = $2,
          status = $3
        WHERE id = $4
        RETURNING *
      `, [b.session_name, b.gm_notes, b.status, sessionId]);

      return json(res.rows[0]);
    }

    // DELETE — reset session (wipe sub-tables)
    if (method === "DELETE") {
      // Cascading delete handles everything
      await query(`DELETE FROM mission_sessions WHERE id=$1`, [sessionId]);
      return json({ deleted: true });
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("api-mission-session error:", err);
    return serverError();
  }
};

function json(data) { return { statusCode: 200, body: JSON.stringify(data) }; }
function badRequest(msg) { return { statusCode: 400, body: msg }; }
function serverError() { return { statusCode: 500, body: "Server Error" }; }
function methodNotAllowed() { return { statusCode: 405, body: "Method Not Allowed" }; }
