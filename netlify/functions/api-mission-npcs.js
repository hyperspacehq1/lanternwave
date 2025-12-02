// api-mission-npcs.js
import db from "../util/db.js";


export async function handler(event) {
  try {

    // LIST NPCs IN A MISSION
    if (event.httpMethod === "GET") {
      const missionId = event.queryStringParameters?.mission_id;
      if (!missionId) {
        return { statusCode: 400, body: JSON.stringify({ error: "mission_id is required" }) };
      }

      const result = await db.query(
        `SELECT mn.*, n.display_name, n.primary_category
         FROM mission_npcs mn
         JOIN npcs n ON mn.npc_id = n.id
         WHERE mn.mission_id = $1
         ORDER BY n.display_name ASC`,
        [missionId]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ mission_npcs: result.rows })
      };
    }

    // ADD NPC → MISSION
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const { mission_id, npc_id, is_known, gm_only_notes } = body;

      if (!mission_id || !npc_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "mission_id and npc_id are required" })
        };
      }

      const result = await db.query(
        `INSERT INTO mission_npcs
          (mission_id, npc_id, is_known, gm_only_notes)
         VALUES ($1,$2,$3,$4)
         RETURNING *`,
        [mission_id, npc_id, is_known || false, gm_only_notes || ""]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ mission_npc: result.rows[0] })
      };
    }

    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-mission-npcs error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
