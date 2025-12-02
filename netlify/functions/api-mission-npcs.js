// netlify/functions/api-mission-npcs.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    /* ---------------------- GET (list mission NPCs) ---------------------- */
    if (event.httpMethod === "GET") {
      const missionId = event.queryStringParameters?.mission_id;

      if (!missionId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "mission_id is required" }),
        };
      }

      const result = await query(
        `SELECT mn.*, n.display_name
         FROM mission_npcs mn
         LEFT JOIN npcs n ON mn.npc_id = n.id
         WHERE mn.mission_id = $1
         ORDER BY mn.id ASC`,
        [missionId]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ mission_npcs: result.rows }),
      };
    }

    /* ---------------------- POST (assign NPC to mission) ---------------------- */
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { mission_id, npc_id, is_known, gm_only_notes } = body;

      if (!mission_id || !npc_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "mission_id and npc_id are required",
          }),
        };
      }

      const result = await query(
        `INSERT INTO mission_npcs
           (mission_id, npc_id, is_known, gm_only_notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [mission_id, npc_id, is_known ?? true, gm_only_notes || ""]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ mission_npc: result.rows[0] }),
      };
    }

    /* ---------------------- Method Not Allowed ---------------------- */
    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-mission-npcs error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
