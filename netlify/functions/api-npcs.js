// netlify/functions/api-npcs.js
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
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;

  try {
    // GET: list all NPCs
    if (method === "GET") {
      const res = await query(
        `
        SELECT
          id,
          display_name,
          true_name,
          description_public,
          description_secret,
          primary_category,
          secondary_subtype,
          intent,
          notes,
          personality_json,
          goals_text,
          secrets_text,
          truth_policy_json,
          tone_text
        FROM npcs
        ORDER BY display_name ASC
        `
      );
      return json(200, res.rows || []);
    }

    // POST: create new NPC (full schema)
    if (method === "POST") {
      if (!event.body) {
        return json(400, { error: "Missing body" });
      }
      const payload = JSON.parse(event.body);

      const {
        display_name,
        true_name,
        description_public,
        description_secret,
        primary_category,
        secondary_subtype,
        intent,
        notes,
        personality_json,
        goals_text,
        secrets_text,
        truth_policy_json,
        tone_text,
      } = payload;

      if (!display_name) {
        return json(400, { error: "display_name is required" });
      }

      const res = await query(
        `
        INSERT INTO npcs (
          display_name,
          true_name,
          description_public,
          description_secret,
          primary_category,
          secondary_subtype,
          intent,
          notes,
          personality_json,
          goals_text,
          secrets_text,
          truth_policy_json,
          tone_text
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          COALESCE($9, '{}'::jsonb),
          $10,$11,
          COALESCE($12, '{}'::jsonb),
          $13
        )
        RETURNING *
        `,
        [
          display_name,
          true_name || "",
          description_public || "",
          description_secret || "",
          primary_category || "",
          secondary_subtype || "",
          intent || "",
          notes || "",
          personality_json || {},
          goals_text || "",
          secrets_text || "",
          truth_policy_json || {},
          tone_text || "",
        ]
      );

      return json(200, res.rows[0]);
    }

    // PUT: update existing NPC
    if (method === "PUT") {
      if (!event.body) {
        return json(400, { error: "Missing body" });
      }
      const payload = JSON.parse(event.body);
      const {
        id,
        display_name,
        true_name,
        description_public,
        description_secret,
        primary_category,
        secondary_subtype,
        intent,
        notes,
        personality_json,
        goals_text,
        secrets_text,
        truth_policy_json,
        tone_text,
      } = payload;

      if (!id) {
        return json(400, { error: "id is required" });
      }
      if (!display_name) {
        return json(400, { error: "display_name is required" });
      }

      const res = await query(
        `
        UPDATE npcs
        SET
          display_name       = $1,
          true_name          = $2,
          description_public = $3,
          description_secret = $4,
          primary_category   = $5,
          secondary_subtype  = $6,
          intent             = $7,
          notes              = $8,
          personality_json   = COALESCE($9, '{}'::jsonb),
          goals_text         = $10,
          secrets_text       = $11,
          truth_policy_json  = COALESCE($12, '{}'::jsonb),
          tone_text          = $13
        WHERE id = $14
        RETURNING *
        `,
        [
          display_name,
          true_name || "",
          description_public || "",
          description_secret || "",
          primary_category || "",
          secondary_subtype || "",
          intent || "",
          notes || "",
          personality_json || {},
          goals_text || "",
          secrets_text || "",
          truth_policy_json || {},
          tone_text || "",
          id,
        ]
      );

      if (!res.rows.length) {
        return json(404, { error: "NPC not found" });
      }

      return json(200, res.rows[0]);
    }

    // DELETE: remove NPC
    if (method === "DELETE") {
      if (!event.body) {
        return json(400, { error: "Missing body" });
      }
      const payload = JSON.parse(event.body);
      const { id } = payload;

      if (!id) {
        return json(400, { error: "id is required" });
      }

      await query(`DELETE FROM npcs WHERE id = $1`, [id]);

      return json(200, { status: "ok" });
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("NPC API Error:", err);
    return json(500, { error: "Server Error" });
  }
};
