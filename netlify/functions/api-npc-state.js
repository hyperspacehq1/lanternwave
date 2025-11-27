// netlify/functions/api-npc-state.js
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
  const npcId = params.npc_id || null;
  const phone = params.phone || null;

  if (!sessionId || sessionId < 1 || !npcId || !phone) {
    return json(400, {
      error: "session_id, npc_id, and phone query parameters are required.",
    });
  }

  try {
    if (event.httpMethod === "GET") {
      const res = await query(
        `SELECT id, session_id, npc_id, phone_number, memory, last_updated
         FROM npc_state
         WHERE session_id = $1 AND npc_id = $2 AND phone_number = $3`,
        [sessionId, npcId, phone]
      );

      if (res.rows.length === 0) {
        // Return an empty default state rather than 404, so UI can still render
        return json(200, {
          id: null,
          session_id: sessionId,
          npc_id: npcId,
          phone_number: phone,
          memory: {},
          last_updated: null,
        });
      }

      return json(200, res.rows[0]);
    }

    if (event.httpMethod === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};
      const memory = body.memory && typeof body.memory === "object" ? body.memory : {};

      // Manual upsert
      const existing = await query(
        `SELECT id FROM npc_state
         WHERE session_id = $1 AND npc_id = $2 AND phone_number = $3`,
        [sessionId, npcId, phone]
      );

      let row;
      if (existing.rows.length > 0) {
        const updRes = await query(
          `UPDATE npc_state
           SET memory = $1,
               last_updated = NOW()
           WHERE id = $2
           RETURNING *`,
          [memory, existing.rows[0].id]
        );
        row = updRes.rows[0];
      } else {
        const insRes = await query(
          `INSERT INTO npc_state
             (session_id, npc_id, phone_number, memory, last_updated)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING *`,
          [sessionId, npcId, phone, memory]
        );
        row = insRes.rows[0];
      }

      return json(200, row);
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("api-npc-state error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
