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
    if (event.httpMethod !== "GET") {
      return json(405, { error: "Method Not Allowed" });
    }

    const { session_id } = qs;

    if (!session_id) {
      return json(400, { error: "session_id is required" });
    }

    const r = await query(
      `SELECT id, session_id, phone_number, direction, body, timestamp
       FROM message_logs
       WHERE session_id=$1
       ORDER BY timestamp ASC, id ASC`,
      [session_id]
    );

    return json(200, r.rows);
  } catch (err) {
    console.error("api-mission-messages error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
