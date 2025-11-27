// netlify/functions/api-mission-sessions.js
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

  try {
    if (event.httpMethod === "GET") {
      // List sessions with mission name + mission code
      const result = await query(
        `SELECT
           ms.id,
           ms.mission_id,
           ms.session_name,
           ms.gm_notes,
           ms.status,
           ms.started_at,
           ms.ended_at,
           ms.created_at,
           m.name AS mission_name,
           m.mission_id_code
         FROM mission_sessions ms
         LEFT JOIN missions m ON m.id = ms.mission_id
         ORDER BY ms.created_at DESC`
      );
      return json(200, result.rows || []);
    }

    if (event.httpMethod === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};
      const { mission_id, session_name, gm_notes = "" } = body;

      if (!mission_id || Number(mission_id) < 1 || !session_name?.trim()) {
        return json(400, { error: "mission_id >= 1 and session_name are required." });
      }

      // Validate mission exists
      const mid = Number(mission_id);
      const missionRes = await query(
        "SELECT id, name FROM missions WHERE id = $1",
        [mid]
      );
      if (missionRes.rows.length === 0) {
        return json(400, { error: `Mission id ${mid} does not exist.` });
      }

      // Insert session
      const insertRes = await query(
        `INSERT INTO mission_sessions
           (mission_id, session_name, gm_notes, status, created_at)
         VALUES ($1, $2, $3, 'new', NOW())
         RETURNING *`,
        [mid, session_name.trim(), gm_notes.trim()]
      );

      return json(200, insertRes.rows[0]);
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("api-mission-sessions error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
