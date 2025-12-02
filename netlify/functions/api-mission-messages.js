const db = require("../util/db.js");

exports.handler = async (event) => {
  try {
    /* ---------------------- GET Mission Messages ---------------------- */
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
         FROM messages
         WHERE mission_id = $1
         ORDER BY created_at ASC`,
        [missionId]
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    }

    /* -------------------------------------------------------------------
       NOTE: You never had a POST route for messages in your old version.
       The system receives messages via SMS → api-sms.js instead.
       I'm preserving that architecture to avoid breakage.
    -------------------------------------------------------------------- */

    return { statusCode: 405, body: "Method Not Allowed" };

  } catch (err) {
    console.error("api-mission-messages error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
