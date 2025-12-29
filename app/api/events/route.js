import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EVENT_TYPES = new Set([
  "combat",
  "story",
  "exploration",
  "social",
  "downtime",
]);

const MIN_PRIORITY = 0;
const MAX_PRIORITY = 100;

/* -----------------------------------------------------------
   GET /api/events
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    const campaignId = searchParams.get("campaign_id");
    const sessionId = searchParams.get("session_id");

    // ---- SINGLE EVENT ----
    if (id) {
      const { rows } = await query(
        `
        SELECT *
          FROM events
         WHERE tenant_id = $1
           AND id = $2
           AND deleted_at IS NULL
        `,
        [tenantId, id]
      );

      return Response.json(
        rows[0]
          ? sanitizeRow(rows[0], {
              name: 120,
              description: 10000,
              eventType: 50,
              priority: 10,
            })
          : null
      );
    }

    // ---- CAMPAIGN / SESSION LIST ----
    if (campaignId) {
      const params = [tenantId, campaignId];
      let where = `tenant_id = $1 AND campaign_id = $2`;

      if (sessionId) {
        params.push(sessionId);
        where += ` AND session_id = $3`;
      }

      const { rows } = await query(
        `
        SELECT *
          FROM events
         WHERE ${where}
           AND deleted_at IS NULL
         ORDER BY priority DESC, created_at ASC
        `,
        params
      );

      return Response.json(
        sanitizeRows(rows, {
          name: 120,
          description: 10000,
          eventType: 50,
          priority: 10,
        })
      );
    }

    // Fallback (no filters)
    return Response.json([]);
  } catch (err) {
    console.error("GET /api/events failed", err);
    return Response.json(
      { error: "Failed to load events" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   POST /api/events
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const body = await req.json();

    if (!body?.campaign_id || !body?.session_id) {
      return Response.json(
        { error: "campaign_id and session_id are required" },
        { status: 400 }
      );
    }

    if (!body?.name || !body.name.trim()) {
      return Response.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    if (
      body.event_type !== undefined &&
      !ALLOWED_EVENT_TYPES.has(body.event_type)
    ) {
      return Response.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    if (
      body.priority !== undefined &&
      (typeof body.priority !== "number" ||
        body.priority < MIN_PRIORITY ||
        body.priority > MAX_PRIORITY)
    ) {
      return Response.json(
        { error: "Invalid priority" },
        { status: 400 }
      );
    }

    const session = await query(
      `
      SELECT id
        FROM sessions
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
      `,
      [tenantId, body.session_id]
    );

    if (!session.rows.length) {
      return Response.json(
        { error: "Invalid session_id" },
        { status: 403 }
      );
    }

    const { rows } = await query(
      `
      INSERT INTO events (
        tenant_id,
        campaign_id,
        session_id,
        name,
        description,
        event_type,
        priority
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        tenantId,
        body.campaign_id,
        body.session_id,
        body.name.trim(),
        body.description ?? null,
        body.event_type ?? null,
        body.priority ?? 0,
      ]
    );

    return Response.json(
      sanitizeRow(rows[0], {
        name: 120,
        description: 10000,
        eventType: 50,
        priority: 10,
      }),
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/events failed", err);
    return Response.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   PUT /api/events?id=
------------------------------------------------------------ */
export async function PUT(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const body = await req.json();

    if ("name" in body && (!body.name || !body.name.trim())) {
      return Response.json(
        { error: "name cannot be blank" },
        { status: 400 }
      );
    }

    if (
      "event_type" in body &&
      !ALLOWED_EVENT_TYPES.has(body.event_type)
    ) {
      return Response.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    if (
      "priority" in body &&
      (typeof body.priority !== "number" ||
        body.priority < MIN_PRIORITY ||
        body.priority > MAX_PRIORITY)
    ) {
      return Response.json(
        { error: "Invalid priority" },
        { status: 400 }
      );
    }

    const sets = [];
    const values = [tenantId, id];
    let i = 3;

    if (body.name !== undefined) {
      sets.push(`name = $${i++}`);
      values.push(body.name.trim());
    }

    if (body.description !== undefined) {
      sets.push(`description = $${i++}`);
      values.push(body.description);
    }

    if (body.event_type !== undefined) {
      sets.push(`event_type = $${i++}`);
      values.push(body.event_type);
    }

    if (body.priority !== undefined) {
      sets.push(`priority = $${i++}`);
      values.push(body.priority);
    }

    if (!sets.length) {
      return Response.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    const { rows } = await query(
      `
      UPDATE events
         SET ${sets.join(", ")},
             updated_at = NOW()
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING *
      `,
      values
    );

    return Response.json(
      rows[0]
        ? sanitizeRow(rows[0], {
            name: 120,
            description: 10000,
            eventType: 50,
            priority: 10,
          })
        : null
    );
  } catch (err) {
    console.error("PUT /api/events failed", err);
    return Response.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   DELETE /api/events?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const { rows } = await query(
      `
      UPDATE events
         SET deleted_at = NOW(),
             updated_at = NOW()
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING *
      `,
      [tenantId, id]
    );

    return Response.json(
      rows[0]
        ? sanitizeRow(rows[0], {
            name: 120,
            description: 10000,
            eventType: 50,
            priority: 10,
          })
        : null
    );
  } catch (err) {
    console.error("DELETE /api/events failed", err);
    return Response.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
