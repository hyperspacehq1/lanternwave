// api-npc-state.js
import db from "./util/db.js";

export async function handler(event) {
  try {

    // GET NPC STATE FOR SESSION
    if (event.httpMethod === "GET") {
      const { session_id, npc_id } = event.queryStringParameters;

      if (!session_id || !npc_id) {
        return { statusCode: 400, body: JSON.stringify({ error: "session_id and npc_id are required" }) };
      }

      const result = await db.query(
        `SELECT *
         FROM npc_state
         WHERE session_id = $1 AND npc_id = $2`,
        [session_id, npc_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ npc_state: result.rows[0] || null })
      };
    }

    // UPDATE NPC STATE
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const { session_id, npc_id, memory, phone_number } = body;

      if (!session_id || !npc_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "session_id and npc_id required" })
        };
      }

      const result = await db.query(
        `INSERT INTO npc_state
          (session_id, npc_id, phone_number, memory, last_updated)
         VALUES ($1,$2,$3,$4, NOW())
         ON CONFLICT (session_id, npc_id)
         DO UPDATE
           SET phone_number = EXCLUDED.phone_number,
               memory = EXCLUDED.memory,
               last_updated = NOW()
         RETURNING *`,
        [
          session_id,
          npc_id,
          phone_number || null,
          memory || {}
        ]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ npc_state: result.rows[0] })
      };
    }

    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-npc-state error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
