// netlify/functions/api-mission-npcs.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;
  const missionId = event.queryStringParameters.mission_id;

  if (!missionId) {
    return { statusCode: 400, body: "mission_id required" };
  }

  try {
    if (method === "GET") {
      const res = await query(
        `SELECT mn.*, n.display_name
         FROM mission_npcs mn
         JOIN npcs n ON n.id = mn.npc_id
         WHERE mn.mission_id=$1`,
        [missionId]
      );

      return json(res.rows);
    }

    if (method === "POST") {
      const b = JSON.parse(event.body);

      const res = await query(
        `INSERT INTO mission_npcs (mission_id,npc_id,is_known)
         VALUES ($1,$2,$3) RETURNING *`,
        [missionId, b.npc_id, b.is_known]
      );

      return json(res.rows[0]);
    }

    if (method === "PUT") {
      const linkId = event.queryStringParameters.link_id;
      const b = JSON.parse(event.body);

      const res = await query(
        `UPDATE mission_npcs SET is_known=$1
         WHERE id=$2 RETURNING *`,
        [b.is_known, linkId]
      );

      return json(res.rows[0]);
    }

    if (method === "DELETE") {
      const linkId = event.queryStringParameters.link_id;
      await query("DELETE FROM mission_npcs WHERE id=$1", [linkId]);
      return json("Deleted");
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("Mission NPC API Error:", err);
    return { statusCode: 500, body: "Server Error" };
  }
};

function json(d) {
  return {
    statusCode: 200,
    body: JSON.stringify(d),
  };
}
