import { query } from "../util/db.js";

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export const handler = async (event) => {
  const qs = event.queryStringParameters || {};

  try {
    if (event.httpMethod === "GET") {
      const { session_id, phone_number } = qs;
      if (!session_id || !phone_number) {
        return json(400, {
          error: "session_id and phone_number are required",
        });
      }

      const r = await query(
        `SELECT *
         FROM mission_player_state
         WHERE session_id=$1 AND phone_number=$2`,
        [session_id, phone_number]
      );
      if (r.rows.length === 0) {
        return json(200, null);
      }
      return json(200, r.rows[0]);
    }

    if (event.httpMethod === "PUT") {
      const body = JSON.parse(event.body || "{}");
      const { session_id, phone_number, progress_flags, discovered_clues } = body;

      if (!session_id || !phone_number) {
        return json(400, {
          error: "session_id and phone_number are required",
        });
      }

      const r = await query(
        `INSERT INTO mission_player_state
           (session_id, phone_number, progress_flags, discovered_clues, last_update)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (session_id, phone_number)
         DO UPDATE SET
           progress_flags=EXCLUDED.progress_flags,
           discovered_clues=EXCLUDED.discovered_clues,
           last_update=NOW()
         RETURNING *`,
        [
          session_id,
          phone_number,
          progress_flags || {},
          discovered_clues || [],
        ]
      );

      return json(200, r.rows[0]);
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("api-player-state error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
