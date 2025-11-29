// netlify/functions/api-events.js
// ✔ FINAL PATCHED VERSION
// ✔ Supports GET / POST / PUT / DELETE (soft delete)
// ✔ Matches existing schema and admin gate
// ✔ Compatible with mission-api.js
// ✔ Filters out archived events
// ✔ Uses payload JSON cleanly
// Reference: :contentReference[oaicite:0]{index=0}

const { query } = require("../util/db.js");
const { requireAdmin } = require("../util/auth.js");

const json = (statusCode, data) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  },
  body: JSON.stringify(data),
});

exports.handler = async (event) => {
  try {
    // CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
        },
        body: "",
      };
    }

    // Admin API security
    const adminCheck = requireAdmin(event.headers);
    if (!adminCheck.ok) return adminCheck.response;

    const { httpMethod } = event;

    // ======================================================
    // GET — list events for session_id
    // ======================================================
    if (httpMethod === "GET") {
      const { session_id } = event.queryStringParameters || {};

      if (!session_id) {
        return json(400, { error: "session_id is required" });
      }

      const result = await query(
        `
        SELECT id, session_id, phone_number, event_type, payload, created_at
        FROM mission_events
        WHERE session_id = $1
          AND (payload->>'archived') IS DISTINCT FROM 'true'
        ORDER BY created_at ASC
        `,
        [Number(session_id)]
      );

      return json(200, { events: result.rows });
    }

    // ======================================================
    // POST — create event
    // ======================================================
    if (httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const {
        session_id,
        event_type,
        phone_number,
        summary,
        details,
        severity,
      } = body;

      if (!session_id || !event_type || !summary || !severity) {
        return json(400, {
          error:
            "session_id, event_type, summary, and severity are required fields",
        });
      }

      const payload = {
        summary,
        details: details || "",
        severity,
        archived: false,
        source: "gm_ui",
      };

      const result = await query(
        `
        INSERT INTO mission_events (session_id, phone_number, event_type, payload)
        VALUES ($1, $2, $3, $4::jsonb)
        RETURNING id, session_id, phone_number, event_type, payload, created_at
        `,
        [
          Number(session_id),
          phone_number || null,
          event_type,
          JSON.stringify(payload),
        ]
      );

      return json(200, { event: result.rows[0] });
    }

    // ======================================================
    // PUT — edit event
    // ======================================================
    if (httpMethod === "PUT") {
      const body = JSON.parse(event.body || "{}");
      const {
        id,
        event_type,
        phone_number,
        summary,
        details,
        severity,
      } = body;

      if (!id || !event_type || !summary || !severity) {
        return json(400, {
          error: "id, event_type, summary, and severity are required",
        });
      }

      // Fetch existing event to preserve archived flag if present
      const existing = await query(
        `SELECT payload FROM mission_events WHERE id = $1`,
        [Number(id)]
      );

      if (existing.rows.length === 0) {
        return json(404, { error: "Event not found" });
      }

      const oldPayload = existing.rows[0].payload || {};
      const archivedFlag = oldPayload.archived === true;

      const newPayload = {
        summary,
        details: details || "",
        severity,
        archived: archivedFlag,
        source: "gm_ui",
      };

      const result = await query(
        `
        UPDATE mission_events
        SET event_type = $1,
            phone_number = $2,
            payload = $3::jsonb
        WHERE id = $4
        RETURNING id, session_id, phone_number, event_type, payload, created_at
        `,
        [
          event_type,
          phone_number || null,
          JSON.stringify(newPayload),
          Number(id),
        ]
      );

      return json(200, { event: result.rows[0] });
    }

    // ======================================================
    // DELETE — SOFT DELETE (archive)
    // ======================================================
    if (httpMethod === "DELETE") {
      const { id } = JSON.parse(event.body || "{}");
      if (!id) return json(400, { error: "id is required" });

      const existing = await query(
        `SELECT payload FROM mission_events WHERE id = $1`,
        [Number(id)]
      );

      if (existing.rows.length === 0) {
        return json(404, { error: "Event not found" });
      }

      const old = existing.rows[0].payload || {};

      // Inject archived flag
      const archivedPayload = {
        ...old,
        archived: true,
      };

      const result = await query(
        `
        UPDATE mission_events
        SET payload = $1::jsonb
        WHERE id = $2
        RETURNING id
        `,
        [JSON.stringify(archivedPayload), Number(id)]
      );

      return json(200, { ok: true });
    }

    // Fallback — Unsupported method
    return json(405, { error: "Method not allowed" });

  } catch (err) {
    console.error("[api-events] ERROR:", err);
    return json(500, { error: "Internal server error" });
  }
};
