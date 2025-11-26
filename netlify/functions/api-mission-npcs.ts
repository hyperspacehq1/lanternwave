// netlify/functions/api-mission-npcs.ts
import { Handler } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler: Handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;
  const missionId = event.queryStringParameters?.mission_id;

  try {
    if (!missionId) {
      return { statusCode: 400, body: "mission_id required" };
    }

    // List NPCs for mission
    if (method === "GET") {
      const res = await query(
        `SELECT mn.*, n.display_name
         FROM mission_npcs mn
         JOIN npcs n ON n.id = mn.npc_id
         WHERE mn.mission_id=$1`,
        [missionId]
      );

      return { statusCode: 200, body: JSON.stringify(res.rows) };
    }

    // Add NPC to mission
    if (method === "POST") {
      const body = JSON.parse(event.body);

      const res = await query(
        `INSERT INTO mission_npcs (mission_id, npc_id, is_known)
         VALUES ($1,$2,$3)
         RETURNING *`,
        [missionId, body.npc_id, body.is_known]
      );

      return { statusCode: 200, body: JSON.stringify(res.rows[0]) };
    }

    // Update known/unknown
    if (method === "PUT") {
      const id = event.queryStringParameters?.link_id;
      const body = JSON.parse(event.body);

      const res = await query(
        `UPDATE mission_npcs
         SET is_known=$1
         WHERE id=$2
         RETURNING *`,
        [body.is_known, id]
      );

      return { statusCode: 200, body: JSON.stringify(res.rows[0]) };
    }

    // Remove NPC from mission
    if (method === "DELETE") {
      const id = event.queryStringParameters?.link_id;
      await query(`DELETE FROM mission_npcs WHERE id=$1`, [id]);
      return { statusCode: 200, body: "Deleted" };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("Mission NPC API Error:", err);
    return { statusCode: 500, body: "Server Error" };
  }
};
