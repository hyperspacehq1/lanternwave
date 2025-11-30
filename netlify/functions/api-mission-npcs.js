// netlify/functions/api-mission-npcs.js
import { query } from "../util/db.js";

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export const handler = async (event) => {
  const method = event.httpMethod;

  try {
    // GET: /api-mission-npcs?mission_id=123
    if (method === "GET") {
      const missionId = event.queryStringParameters?.mission_id;
      if (!missionId) {
        return json(400, { error: "mission_id is required" });
      }

      const res = await query(
        `
        SELECT
          mn.id,
          mn.mission_id,
          mn.npc_id,
          mn.is_known,
          mn.gm_only_notes,
          n.display_name,
          n.primary_category,
          n.secondary_subtype,
          n.intent
        FROM mission_npcs mn
        JOIN npcs n ON n.id = mn.npc_id
        WHERE mn.mission_id = $1
        ORDER BY n.display_name ASC
        `,
        [missionId]
      );

      return json(200, res.rows || []);
    }

    // POST: add / upsert roster entry
    if (method === "POST") {
      if (!event.body) {
        return json(400, { error: "Missing body" });
      }
      const payload = JSON.parse(event.body);
      const { mission_id, npc_id, is_known, gm_only_notes } = payload;

      if (!mission_id || !npc_id) {
        return json(400, {
          error: "mission_id and npc_id are required",
        });
      }

      const res = await query(
        `
        INSERT INTO mission_npcs (mission_id, npc_id, is_known, gm_only_notes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (mission_id, npc_id)
        DO UPDATE SET
          is_known = EXCLUDED.is_known,
          gm_only_notes = EXCLUDED.gm_only_notes
        RETURNING *
        `,
        [mission_id, npc_id, is_known ?? false, gm_only_notes ?? ""]
      );

      return json(200, res.rows[0]);
    }

    // DELETE: remove NPC from campaign
    if (method === "DELETE") {
      if (!event.body) {
        return json(400, { error: "Missing body" });
      }
      const payload = JSON.parse(event.body);
      const { mission_id, npc_id } = payload;

      if (!mission_id || !npc_id) {
        return json(400, {
          error: "mission_id and npc_id are required",
        });
      }

      await query(
        `DELETE FROM mission_npcs WHERE mission_id = $1 AND npc_id = $2`,
        [mission_id, npc_id]
      );

      return json(200, { status: "ok" });
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("api-mission-npcs error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
