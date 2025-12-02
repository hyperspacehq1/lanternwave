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

      if (!body.name) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "name is required" }),
        };
      }

      const result = await query(
        `INSERT INTO missions (name)
         VALUES ($1)
         RETURNING *`,
        [body.name]
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
