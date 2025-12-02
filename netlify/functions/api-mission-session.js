const db = require("../util/db.js");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const sessionId = event.queryStringParameters?.session_id;
    if (!sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "session_id is required" }),
      };
    }

    const result = await db.query(
      `SELECT *
       FROM mission_sessions
       WHERE id = $1`,
      [sessionId]
    );

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows[0] || null),
    };

  } catch (err) {
    console.error("api-mission-session error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
