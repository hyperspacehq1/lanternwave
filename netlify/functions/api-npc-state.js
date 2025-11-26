// netlify/functions/api-npc-state.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const sessionId = event.queryStringParameters.session_id;
  const npcId = event.queryStringParameters.npc_id;
  const phone = event.queryStringParameters.phone;

  if (!sessionId || !npcId || !phone)
    return badRequest("Missing session_id, npc_id, or phone");

  const method = event.httpMethod;

  try {
    // GET — retrieve memory object
    if (method === "GET") {
      const res = await query(`
        SELECT * FROM mission_npc_state
        WHERE session_id=$1 AND npc_id=$2 AND phone_number=$3
      `, [sessionId, npcId, phone]);

      return json(res.rows[0] || {});
    }

    // POST — update memory
    if (method === "POST") {
      const b = JSON.parse(event.body);

      const res = await query(`
        INSERT INTO mission_npc_state
        (session_id, npc_id, phone_number, knowledge_json, flags_json, trust_level)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (session_id, npc_id, phone_number)
        DO UPDATE SET
          knowledge_json = EXCLUDED.knowledge_json,
          flags_json = EXCLUDED.flags_json,
          trust_level = EXCLUDED.trust_level,
          last_interaction = NOW()
        RETURNING *
      `, [
        sessionId, npcId, phone,
        b.knowledge_json || {},
        b.flags_json || {},
        b.trust_level || 0
      ]);

      return json(res.rows[0]);
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("api-npc-state error:", err);
    return serverError();
  }
};

function json(d) { return { statusCode: 200, body: JSON.stringify(d) }; }
function badRequest(m) { return { statusCode: 400, body: m }; }
function serverError() { return { statusCode: 500, body: "Server Error" }; }
function methodNotAllowed() { return { statusCode: 405, body: "Method Not Allowed" }; }
