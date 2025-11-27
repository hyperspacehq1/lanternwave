// netlify/functions/api-mission-session.js
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
  const id = params.id ? Number(params.id) : null;
  if (!id || id < 1) {
    return json(400, { error: "Valid session id is required." });
  }

  try {
    if (event.httpMethod === "GET") {
      // Session + mission name/code
      const res = await query(
        `SELECT
           ms.*,
           m.name AS mission_name,
           m.mission_id_code
         FROM mission_sessions ms
         LEFT JOIN missions m ON m.id = ms.mission_id
         WHERE ms.id = $1`,
        [id]
      );

      if (res.rows.length === 0) {
        return json(404, { error: "Session not found." });
      }

      return json(200, res.rows[0]);
    }

    if (event.httpMethod === "PUT") {
      const body = event.body ? JSON.parse(event.body) : {};
      const fields = [];
      const values = [];
      let idx = 1;

      if (body.session_name !== undefined) {
        fields.push(`session_name = $${idx++}`);
        values.push(body.session_name);
      }
      if (body.gm_notes !== undefined) {
        fields.push(`gm_notes = $${idx++}`);
        values.push(body.gm_notes);
      }
      if (body.status !== undefined) {
        fields.push(`status = $${idx++}`);
        values.push(body.status);
      }
      if (body.started_at !== undefined) {
        fields.push(`started_at = $${idx++}`);
        values.push(body.started_at);
      }
      if (body.ended_at !== undefined) {
        fields.push(`ended_at = $${idx++}`);
        values.push(body.ended_at);
      }

      if (fields.length === 0) {
        return json(400, { error: "No fields to update." });
      }

      values.push(id);
      const sql = `
        UPDATE mission_sessions
        SET ${fields.join(", ")}
        WHERE id = $${idx}
        RETURNING *`;
      const updRes = await query(sql, values);

      if (updRes.rows.length === 0) {
        return json(404, { error: "Session not found for update." });
      }

      return json(200, updRes.rows[0]);
    }

    if (event.httpMethod === "DELETE") {
      // "Reset" a session: clear events/logs/npc state/players, mark status reset
      await query("DELETE FROM mission_events WHERE session_id = $1", [id]);
      await query("DELETE FROM mission_logs   WHERE session_id = $1", [id]);
      await query("DELETE FROM npc_state      WHERE session_id = $1", [id]);
      await query("DELETE FROM session_players WHERE session_id = $1", [id]);

      const updRes = await query(
        `UPDATE mission_sessions
         SET status = 'reset',
             started_at = NULL,
             ended_at = NULL,
             gm_notes = ''
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (updRes.rows.length === 0) {
        return json(404, { error: "Session not found for reset." });
      }

      return json(200, { ok: true, session: updRes.rows[0] });
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("api-mission-session error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
