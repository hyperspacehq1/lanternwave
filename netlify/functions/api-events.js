import { query } from "../util/db.js";

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function normalizePayload(severity, summary, payload) {
  const base = payload && typeof payload === "object" ? payload : {};
  return {
    ...base,
    severity: severity || base.severity || "info",
    summary: summary ?? base.summary ?? "",
  };
}

function mapRowToClient(row) {
  const p = row.payload || {};
  return {
    id: row.id,
    session_id: row.session_id,
    phone_number: row.phone_number,
    event_type: row.event_type,
    created_at: row.created_at,
    archived: row.archived,
    severity: p.severity || "info",
    summary: p.summary || "",
    payload: p,
  };
}

export const handler = async (event) => {
  const qs = event.queryStringParameters || {};

  try {
    if (event.httpMethod === "GET") {
      const { session_id } = qs;

      if (!session_id) {
        return json(400, { error: "session_id is required" });
      }

      const r = await query(
        `SELECT *
         FROM mission_events
         WHERE session_id=$1
           AND (archived IS NULL OR archived = false)
         ORDER BY created_at DESC, id DESC`,
        [session_id]
      );

      return json(200, r.rows.map(mapRowToClient));
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { session_id, severity, summary, payload } = body;

      if (!session_id) {
        return json(400, { error: "session_id is required" });
      }

      const fullPayload = normalizePayload(severity, summary, payload);
      const eventType =
        (payload && payload.event_type) || "generic";

      const r = await query(
        `INSERT INTO mission_events
           (session_id, phone_number, event_type, payload, created_at, archived)
         VALUES ($1,$2,$3,$4,NOW(),false)
         RETURNING *`,
        [session_id, null, eventType, fullPayload]
      );

      return json(201, mapRowToClient(r.rows[0]));
    }

    if (event.httpMethod === "PUT") {
      const body = JSON.parse(event.body || "{}");
      const { session_id, event_id, severity, summary, payload } = body;

      if (!session_id || !event_id) {
        return json(400, {
          error: "session_id and event_id are required",
        });
      }

      const fullPayload = normalizePayload(severity, summary, payload);

      const r = await query(
        `UPDATE mission_events
         SET payload=$1
         WHERE id=$2 AND session_id=$3
         RETURNING *`,
        [fullPayload, event_id, session_id]
      );

      if (r.rows.length === 0) {
        return json(404, { error: "Event not found" });
      }

      return json(200, mapRowToClient(r.rows[0]));
    }

    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const { session_id, event_id } = body;

      if (!session_id || !event_id) {
        return json(400, {
          error: "session_id and event_id are required",
        });
      }

      const r = await query(
        `UPDATE mission_events
         SET archived = true
         WHERE id=$1 AND session_id=$2
         RETURNING *`,
        [event_id, session_id]
      );

      if (r.rows.length === 0) {
        return json(404, { error: "Event not found" });
      }

      return json(200, { success: true });
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("api-events error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};
