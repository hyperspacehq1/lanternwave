const db = require("../util/db.js");

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "GET") {
      const missionId = event.queryStringParameters?.mission_id;
      if (!missionId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "mission_id is required" }),
        };
      }

      const result = await db.query(
        `SELECT *
         FROM mission_sessions
         WHERE mission_id = $1
         ORDER BY id ASC`,
        [missionId]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const { mission_id, session_name } = body;
      if (!mission_id || !session_name) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "mission_id and session_name are required",
          }),
        };
      }

      const result = await db.query(
        `INSERT INTO mission_sessions (mission_id, session_name, status, created_at)
         VALUES ($1, $2, 'active', NOW())
         RETURNING *`,
        [mission_id, session_name]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ session: result.rows[0] }),
      };
    }

    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-mission-sessions error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
