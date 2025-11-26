// netlify/functions/api-missions.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;

  try {
    if (method === "GET") {
      const res = await query("SELECT * FROM missions ORDER BY id DESC");
      return json(res.rows);
    }

    if (method === "POST") {
      const body = JSON.parse(event.body);

      const res = await query(
        `INSERT INTO missions
         (mission_id_code, name, region, weather, mission_date, summary_known, summary_unknown)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          body.mission_id_code,
          body.name,
          body.region,
          body.weather,
          body.mission_date,
          body.summary_known,
          body.summary_unknown,
        ]
      );

      return json(res.rows[0]);
    }

    if (method === "PUT") {
      const id = event.queryStringParameters.id;
      const body = JSON.parse(event.body);

      const res = await query(
        `UPDATE missions SET
         mission_id_code=$1,name=$2,region=$3,weather=$4,mission_date=$5,
         summary_known=$6,summary_unknown=$7
         WHERE id=$8
         RETURNING *`,
        [
          body.mission_id_code,
          body.name,
          body.region,
          body.weather,
          body.mission_date,
          body.summary_known,
          body.summary_unknown,
          id,
        ]
      );

      return json(res.rows[0]);
    }

    if (method === "DELETE") {
      const id = event.queryStringParameters.id;
      await query("DELETE FROM missions WHERE id=$1", [id]);
      return json("Deleted");
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("Mission API Error:", err);
    return { statusCode: 500, body: "Server Error" };
  }
};

function json(data) {
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
}
