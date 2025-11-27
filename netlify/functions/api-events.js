// netlify/functions/api-events.js
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
    if (event.httpMethod !== "GET") {
      return json(405, { error: "Method Not Allowed" });
    }

    const res = await query(
      `SELECT
         id,
         session_id,
         event_type,
         payload,
         created_at,
         phone_number
       FROM mission_events
       WHERE session_id = $1
       ORDER BY created_at ASC, id ASC`,
      [sessionId]
    );

    return json(200, res.rows || []);
  } catch (err) {
    console.error("api-events error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
