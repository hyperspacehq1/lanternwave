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

    const { session_id, npc_id } = qs;

    if (!session_id || !npc_id) {
      return json(400, {
        error: "session_id and npc_id are required",
      });
    }

    const r = await query(
      `SELECT *
       FROM mission_npc_state
       WHERE session_id=$1 AND npc_id=$2
       ORDER BY last_interaction DESC NULLS LAST, id DESC
       LIMIT 1`,
      [session_id, npc_id]
    );

    if (r.rows.length === 0) {
      return json(200, {});
    }

    return json(200, r.rows[0]);
  } catch (err) {
    console.error("api-npc-state error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
