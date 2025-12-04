// netlify/functions/api-npcs.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    /* ---------------------- GET ---------------------- */
    if (event.httpMethod === "GET") {
      const result = await query(
        `SELECT *
         FROM npcs
         ORDER BY id ASC`
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ npcs: result.rows }),
      };
    }

    /* ---------------------- POST: CREATE NPC ---------------------- */
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      let {
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
        description_secret,
        notes,
      } = body;

      /* REQUIRED FIELDS */
      if (!display_name || !true_name) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "display_name and true_name are required",
          }),
        };
      }

      /* APPLY SAFE DEFAULTS */
      primary_category   = primary_category   || "unspecified";
      secondary_subtype  = secondary_subtype  || "unspecified";
      intent             = intent             || "unspecified";
      goals_text         = goals_text         || "unsspecified";
      secrets_text       = secrets_text       || "unspecified";
      description_public = description_public || "unspecified";
      description_secret = description_secret || "unspecified";
      notes              = notes              || "unspecified";

      personality_json   = personality_json   || {};
      truth_policy_json  = truth_policy_json  || {};
      tone_text          = tone_text          || null;

      /* INSERT */
      const result = await query(
        `INSERT INTO npcs
          (display_name, true_name, primary_category, secondary_subtype, intent,
           personality_json, goals_text, secrets_text, tone_text,
           truth_policy_json, description_public, description_secret, notes)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
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
          description_secret,
          notes,
        ]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ npc: result.rows[0] }),
      };
    }

    /* ---------------------- INVALID METHOD ---------------------- */
    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-npcs error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
