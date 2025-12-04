// netlify/functions/api-missions.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    /* ---------------------- GET (list missions) ---------------------- */
    if (event.httpMethod === "GET") {
      const result = await query(`
        SELECT *
        FROM missions
        ORDER BY id ASC
      `);

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    }

    /* ---------------------- POST (create mission) ---------------------- */
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const {
        name,
        mission_id_code,
        summary_known,
        summary_unknown,
        region,
        weather,
        mission_date,
        auto_create_sessions,
      } = body;

      if (!name) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "name is required" }),
        };
      }

      const result = await query(
        `INSERT INTO missions (
           mission_id_code,
           name,
           summary_known,
           summary_unknown,
           region,
           weather,
           mission_date,
           auto_create_sessions
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          mission_id_code || null,
          name,
          summary_known || null,
          summary_unknown || null,
          region || null,
          weather || null,
          mission_date || null,
          typeof auto_create_sessions === "boolean"
            ? auto_create_sessions
            : false,
        ]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ mission: result.rows[0] }),
      };
    }

    /* ---------------------- Method Not Allowed ---------------------- */
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  } catch (err) {
    console.error("api-missions error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
