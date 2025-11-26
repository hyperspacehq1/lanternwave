// netlify/functions/api-mission-messages.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

export const handler = async (event) => {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const missionId = event.queryStringParameters.mission_id;
  const phone = event.queryStringParameters.phone;

  if (!missionId || !phone) {
    return { statusCode: 400, body: "mission_id and phone required" };
  }

  try {
    const res = await query(
      `SELECT * FROM messages
       WHERE mission_id=$1 AND phone_number=$2
       ORDER BY created_at ASC`,
      [missionId, phone]
    );

    return {
      statusCode: 200,
      body: JSON.stringify(res.rows),
    };
  } catch (err) {
    console.error("Message API Error:", err);
    return { statusCode: 500, body: "Server Error" };
  }
};
