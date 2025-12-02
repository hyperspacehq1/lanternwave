const db = require("../util/db.js");

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "GET") {
      const result = await db.query(
        `SELECT *
         FROM missions
         ORDER BY id ASC`
      );
      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      if (!body.name) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "name is required" }),
        };
      }

      const result = await db.query(
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

    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-missions error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
