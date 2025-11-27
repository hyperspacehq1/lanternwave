// netlify/functions/api-session-logs.js
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
         message,
         direction,
         created_at,
         phone_number,
         npc_id
       FROM mission_logs
       WHERE session_id = $1
       ORDER BY created_at ASC, id ASC`,
      [sessionId]
    );

    return json(200, res.rows || []);
  } catch (err) {
    console.error("api-session-logs error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
