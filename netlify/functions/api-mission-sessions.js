// netlify/functions/api-mission-sessions.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;

  try {
    // GET — list sessions
    if (method === "GET") {
      const res = await query(`
        SELECT ms.*, m.name AS mission_name
        FROM mission_sessions ms
        JOIN missions m ON m.id = ms.mission_id
        ORDER BY ms.id DESC
      `);
      return json(res.rows);
    }

    // POST — create new session
    if (method === "POST") {
      const body = JSON.parse(event.body);

      const res = await query(`
        INSERT INTO mission_sessions
        (mission_id, session_name, gm_notes)
        VALUES ($1,$2,$3)
        RETURNING *
      `, [body.mission_id, body.session_name, body.gm_notes]);

      return json(res.rows[0]);
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("mission-sessions error:", err);
    return serverError();
  }
};

function json(data) { return { statusCode: 200, body: JSON.stringify(data) }; }
function serverError() { return { statusCode: 500, body: "Server Error" }; }
function methodNotAllowed() { return { statusCode: 405, body: "Method Not Allowed" }; }
