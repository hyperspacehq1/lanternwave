// netlify/functions/api-missions.ts
import { Handler } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler: Handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;

  try {
    // GET /api/missions
    if (method === "GET") {
      const res = await query(`SELECT * FROM missions ORDER BY id DESC`);
      return {
        statusCode: 200,
        body: JSON.stringify(res.rows),
      };
    }

    // POST /api/missions
    if (method === "POST") {
      const body = JSON.parse(event.body);
      const {
        mission_id_code,
        name,
        region,
        weather,
        mission_date,
        summary_known,
        summary_unknown,
      } = body;

      const res = await query(
        `INSERT INTO missions
        (mission_id_code, name, region, weather, mission_date, summary_known, summary_unknown)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
        [
          mission_id_code,
          name,
          region,
          weather,
          mission_date,
          summary_known,
          summary_unknown,
        ]
      );

      return { statusCode: 200, body: JSON.stringify(res.rows[0]) };
    }

    // PUT /api/missions?id=#
    if (method === "PUT") {
      const id = event.queryStringParameters?.id;
      const updates = JSON.parse(event.body);

      const res = await query(
        `UPDATE missions SET
         mission_id_code=$1, name=$2, region=$3, weather=$4, mission_date=$5,
         summary_known=$6, summary_unknown=$7
         WHERE id=$8
         RETURNING *`,
        [
          updates.mission_id_code,
          updates.name,
          updates.region,
          updates.weather,
          updates.mission_date,
          updates.summary_known,
          updates.summary_unknown,
          id,
        ]
      );

      return { statusCode: 200, body: JSON.stringify(res.rows[0]) };
    }

    // DELETE /api/missions?id=#
    if (method === "DELETE") {
      const id = event.queryStringParameters?.id;
      await query(`DELETE FROM missions WHERE id=$1`, [id]);
      return { statusCode: 200, body: "Deleted" };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("Mission API Error:", err);
    return { statusCode: 500, body: "Server Error" };
  }
};
