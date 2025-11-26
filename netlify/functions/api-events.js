// netlify/functions/api-events.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const sessionId = event.queryStringParameters.session_id;
  if (!sessionId) return badRequest("Missing session_id");

  const method = event.httpMethod;

  try {
    // GET — list events
    if (method === "GET") {
      const res = await query(`
        SELECT * FROM mission_events
        WHERE session_id=$1
        ORDER BY created_at ASC
      `, [sessionId]);

      return json(res.rows);
    }

    // POST — add event
    if (method === "POST") {
      const b = JSON.parse(event.body);

      const res = await query(`
        INSERT INTO mission_events
        (session_id, phone_number, event_type, event_data)
        VALUES ($1,$2,$3,$4)
        RETURNING *
      `, [
        sessionId,
        b.phone_number || null,
        b.event_type,
        b.event_data
      ]);

      return json(res.rows[0]);
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("api-events error:", err);
    return serverError();
  }
};

function json(d) { return { statusCode: 200, body: JSON.stringify(d) }; }
function badRequest(m) { return { statusCode: 400, body: m }; }
function serverError() { return { statusCode: 500, body: "Server Error" }; }
function methodNotAllowed() { return { statusCode: 405, body: "Method Not Allowed" }; }
