import { query } from "../util/db.js";

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};

    if (event.httpMethod === "GET") {
      const { id } = qs;

      if (id) {
        const r = await query(
          "SELECT * FROM missions WHERE id=$1",
          [id]
        );
        if (r.rows.length === 0) {
          return json(404, { error: "Mission not found" });
        }
        return json(200, r.rows[0]);
      }

      const r = await query(
        "SELECT * FROM missions ORDER BY created_at DESC NULLS LAST"
      );
      return json(200, r.rows);
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const {
        mission_id_code,
        name,
        summary_known,
        summary_unknown,
        region,
        weather,
        mission_date,
        auto_create_sessions = false,
      } = body;

      if (!mission_id_code || !name) {
        return json(400, {
          error: "mission_id_code and name are required",
        });
      }

      const r = await query(
        `INSERT INTO missions
         (mission_id_code, name, summary_known, summary_unknown,
          region, weather, mission_date, auto_create_sessions, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
         RETURNING *`,
        [
          mission_id_code,
          name,
          summary_known || null,
          summary_unknown || null,
          region || null,
          weather || null,
          mission_date || null,
          auto_create_sessions,
        ]
      );

      return json(201, r.rows[0]);
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("api-missions error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
