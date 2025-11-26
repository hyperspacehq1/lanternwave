// netlify/functions/api-npcs.ts
import { Handler } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler: Handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;

  try {
    if (method === "GET") {
      const res = await query(`SELECT * FROM npcs ORDER BY id DESC`);
      return { statusCode: 200, body: JSON.stringify(res.rows) };
    }

    if (method === "POST") {
      const body = JSON.parse(event.body);

      const res = await query(
        `INSERT INTO npcs
         (display_name, primary_category, secondary_subtype, intent,
          description_public, description_secret)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          body.display_name,
          body.primary_category,
          body.secondary_subtype,
          body.intent,
          body.description_public,
          body.description_secret,
        ]
      );

      return { statusCode: 200, body: JSON.stringify(res.rows[0]) };
    }

    if (method === "PUT") {
      const id = event.queryStringParameters?.id;
      const body = JSON.parse(event.body);

      const res = await query(
        `UPDATE npcs SET
         display_name=$1, primary_category=$2, secondary_subtype=$3,
         intent=$4, description_public=$5, description_secret=$6
         WHERE id=$7
         RETURNING *`,
        [
          body.display_name,
          body.primary_category,
          body.secondary_subtype,
          body.intent,
          body.description_public,
          body.description_secret,
          id,
        ]
      );

      return { statusCode: 200, body: JSON.stringify(res.rows[0]) };
    }

    if (method === "DELETE") {
      const id = event.queryStringParameters?.id;
      await query(`DELETE FROM npcs WHERE id=$1`, [id]);
      return { statusCode: 200, body: "Deleted" };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("NPC API Error:", err);
    return { statusCode: 500, body: "Server Error" };
  }
};
