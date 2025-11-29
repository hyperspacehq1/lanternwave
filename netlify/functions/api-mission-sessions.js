// netlify/functions/api-mission-sessions.js
// PATCHED to support OPTION B — positional arguments from UI

const { requireAdmin } = require("../util/auth.js");
const { query } = require("../util/db.js");

const json = (statusCode, data) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  },
  body: JSON.stringify(data),
});

exports.handler = async (event) => {
  try {
    // CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return json(200, {});
    }

    // Admin protection
    const adminCheck = requireAdmin(event.headers);
    if (!adminCheck.ok) return adminCheck.response;

    // GET: list sessions
    if (event.httpMethod === "GET") {
      const sessions = await query(
        `SELECT * FROM mission_sessions ORDER BY created_at DESC`
      );
      return json(200, { sessions: sessions.rows });
    }

    // POST: create session (PATCHED to accept multiple shapes)
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      // Accept any of these:
      // body.mission_id OR body.missionId OR body["0"]
      const mission_id =
        body.mission_id ?? body.missionId ?? body[0] ?? null;

      const session_name =
        body.session_name ?? body.sessionName ?? body[1] ?? "";

      const gm_notes =
        body.gm_notes ?? body.gmNotes ?? body[2] ?? "";

      if (!mission_id || !session_name) {
        return json(400, {
          error:
            "mission_id and session_name are required (backend accepts multiple input formats)",
        });
      }

      const result = await query(
        `
        INSERT INTO mission_sessions (mission_id, session_name, gm_notes, status, created_at)
        VALUES ($1, $2, $3, 'new', NOW())
        RETURNING *
        `,
        [mission_id, session_name, gm_notes]
      );

      return json(200, { session: result.rows[0] });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("[api-mission-sessions] ERROR", err);
    return json(500, { error: "Internal Server Error" });
  }
};
