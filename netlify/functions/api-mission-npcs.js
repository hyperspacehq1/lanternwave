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
    if (event.httpMethod !== "GET") {
      return json(405, { error: "Method Not Allowed" });
    }

    const r = await query(
      `SELECT id, display_name, true_name, primary_category,
              secondary_subtype, intent
       FROM npcs
       ORDER BY display_name`
    );

    return json(200, r.rows);
  } catch (err) {
    console.error("api-mission-npcs error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
