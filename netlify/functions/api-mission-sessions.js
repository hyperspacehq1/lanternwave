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
    if (event.httpMethod === "GET") {
      const { mission_id } = qs;

      let sql = `
        SELECT s.*, m.name AS mission_name
        FROM mission_sessions s
        LEFT JOIN missions m ON m.id = s.mission_id
      `;
      const params = [];

      if (mission_id) {
        sql += " WHERE s.mission_id=$1";
        params.push(mission_id);
      }

      sql += " ORDER BY s.created_at DESC NULLS LAST, s.id DESC";

      const r = await query(sql, params);
      return json(200, r.rows);
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { mission_id, session_name, gm_notes } = body;

      if (!mission_id || !session_name) {
        return json(400, {
          error: "mission_id and session_name are required",
        });
      }

      const r = await query(
        `INSERT INTO mission_sessions
           (mission_id, session_name, gm_notes, status, started_at, created_at)
         VALUES ($1,$2,$3,'active',NOW(),NOW())
         RETURNING *`,
        [mission_id, session_name, gm_notes || null]
      );

      return json(201, r.rows[0]);
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("api-mission-sessions error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
