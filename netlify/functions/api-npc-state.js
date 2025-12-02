const db = require("../util/db.js");

exports.handler = async (event) => {
  try {
    /* ---------------------- GET NPC STATE ---------------------- */
    if (event.httpMethod === "GET") {
      const sessionId = event.queryStringParameters?.session_id;
      const npcId = event.queryStringParameters?.npc_id;

      if (!sessionId || !npcId) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "session_id and npc_id are required",
          }),
        };
      }

      const result = await db.query(
        `SELECT *
         FROM npc_state
         WHERE session_id = $1
           AND npc_id = $2`,
        [sessionId, npcId]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows[0] || {}),
      };
    }

    /* ---------------------- POST (update NPC state) ---------------------- */
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const { session_id, npc_id, state } = body;

      if (!session_id || !npc_id || typeof state !== "object") {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "session_id, npc_id, and state (object) are required",
          }),
        };
      }

      const result = await db.query(
        `INSERT INTO npc_state
           (session_id, npc_id, memory, last_updated)
         VALUES
           ($1, $2, $3, NOW())
         ON CONFLICT (session_id, npc_id)
         DO UPDATE SET memory = EXCLUDED.memory,
                       last_updated = NOW()
         RETURNING *`,
        [session_id, npc_id, state]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ npc_state: result.rows[0] }),
      };
    }

    /* ---------------------- Method not allowed ---------------------- */
    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-npc-state error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
