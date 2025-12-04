// netlify/functions/api-npcs.js
// Option A: keep existing structure, modernize to ESM and align with
// MissionManagerPage.jsx + mission-api.js (2025 Netlify style).

import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    /* ---------------------- GET (list all NPCs) ---------------------- */
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

    /* ---------------------- POST (create NPC) ------------------------ */
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      // Required
      const display_name = body.display_name?.trim();
      const true_name = body.true_name?.trim();

      if (!display_name || !true_name) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "display_name and true_name are required",
          }),
        };
      }

      // Required (NOT NULL) with safe default
      const primary_category =
        (body.primary_category && String(body.primary_category).trim()) ||
        "Unspecified";

      // Optional text fields
      const secondary_subtype =
        body.secondary_subtype && String(body.secondary_subtype).trim();
      const intent = body.intent && String(body.intent).trim();
      const goals_text = body.goals_text ?? null;
      const secrets_text = body.secrets_text ?? null;
      const tone_text = body.tone_text ?? null;
      const description_public = body.description_public ?? null;
      const description_secret = body.description_secret ?? null;
      const notes = body.notes ?? null;

      // Optional JSON(B) fields — default to empty objects
      const personality_json = body.personality_json ?? {};
      const truth_policy_json = body.truth_policy_json ?? {};

      const result = await query(
        `INSERT INTO npcs
           (display_name,
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
            notes)
         VALUES
           ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          display_name,
          true_name,
          primary_category,
          secondary_subtype || null,
          intent || null,
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

    /* ---------------------- Method not allowed ----------------------- */
    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("api-npcs error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
