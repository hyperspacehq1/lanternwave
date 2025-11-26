// netlify/functions/api-session-logs.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const sessionId = event.queryStringParameters.session_id;
  if (!sessionId) return { statusCode: 400, body: "Missing session_id" };

  try {
    const logs = await query(`
      SELECT * FROM message_logs
      WHERE session_id=$1
      ORDER BY timestamp ASC
    `, [sessionId]);

    return {
      statusCode: 200,
      body: JSON.stringify(logs.rows)
    };

  } catch (err) {
    console.error("api-session-logs error:", err);
    return { statusCode: 500, body: "Server Error" };
  }
};
