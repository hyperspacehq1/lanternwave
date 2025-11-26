// netlify/functions/api-npcs.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;

  try {
    if (method === "GET") {
      const res = await query("SELECT * FROM npcs ORDER BY id DESC");
      return json(res.rows);
    }

    if (method === "POST") {
      const b = JSON.parse(event.body);

      const res = await query(
        `INSERT INTO npcs
         (display_name,primary_category,secondary_subtype,intent,
          description_public,description_secret)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          b.display_name,
          b.primary_category,
          b.secondary_subtype,
          b.intent,
          b.description_public,
          b.description_secret,
        ]
      );

      return json(res.rows[0]);
    }

    if (method === "PUT") {
      const id = event.queryStringParameters.id;
      const b = JSON.parse(event.body);

      const res = await query(
        `UPDATE npcs SET
         display_name=$1,primary_category=$2,secondary_subtype=$3,
         intent=$4,description_public=$5,description_secret=$6
         WHERE id=$7 RETURNING *`,
        [
          b.display_name,
          b.primary_category,
          b.secondary_subtype,
          b.intent,
          b.description_public,
          b.description_secret,
          id,
        ]
      );

      return json(res.rows[0]);
    }

    if (method === "DELETE") {
      const id = event.queryStringParameters.id;
      await query("DELETE FROM npcs WHERE id=$1", [id]);
      return json("Deleted");
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("NPC API Error:", err);
    return { statusCode: 500, body: "Server Error" };
  }
};

function json(data) {
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
}
