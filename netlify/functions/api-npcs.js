import { requireAdmin } from "../util/auth.js";
import db from "../util/db.js";

export async function handler(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  try {

    if (event.httpMethod === "GET") {
      const result = await db.query(
        `SELECT *
         FROM npcs
         ORDER BY id ASC`
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ npcs: result.rows }),
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const {
        display_name,
        true_name,
        primary_category,
        secondary_subtype,
        intent,
        personality_json,
        goals_text,
        secrets_text,
        tone_text,
        truth_policy_json,
        description_public,
        description_secret
      } = body;

      if (!display_name || !true_name) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "display_name and true_name are required" }),
        };
      }

      const result = await db.query(
        `INSERT INTO npcs
          (display_name, true_name, primary_category, secondary_subtype, intent,
           personality_json, goals_text, secrets_text, tone_text,
           truth_policy_json, description_public, description_secret)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          display_name,
          true_name,
          primary_category,
          secondary_subtype,
          intent,
          personality_json || {},
          goals_text || "",
          secrets_text || "",
          tone_text || "",
          truth_policy_json || {},
          description_public || "",
          description_secret || ""
        ]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ npc: result.rows[0] }),
      };
    }

    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-npcs error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
