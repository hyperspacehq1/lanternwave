import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/events
   ?id=
   ?session_id=
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    const sessionId = searchParams.get("session_id");

    if (id) {
      const { rows } = await query(
        `
        SELECT *
          FROM events
         WHERE tenant_id = $1
           AND id = $2
           AND deleted_at IS NULL
         LIMIT 1
        `,
        [tenantId, id]
      );

      return Response.json(rows[0] ?? null);
    }

    if (sessionId) {
      const { rows } = await query(
        `
        SELECT *
          FROM events
         WHERE tenant_id = $1
           AND session_id = $2
           AND deleted_at IS NULL
         ORDER BY priority DESC, created_at ASC
        `,
        [tenantId, sessionId]
      );

      return Response.json(rows);
    }

    return Response.json([]);
  } catch (err) {
    console.error("GET /api/events failed", err);
    return Response.json([], { status: 200 });
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

    const session = await query(
      `
      SELECT id
        FROM sessions
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       LIMIT 1
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

    return Response.json(rows[0], { status: 201 });
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

    const { rows } = await query(
      `
      UPDATE events
         SET name        = COALESCE($3, name),
             description = COALESCE($4, description),
             event_type  = COALESCE($5, event_type),
             priority    = COALESCE($6, priority),
             updated_at  = NOW()
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING *
      `,
      [
        tenantId,
        id,
        body.name,
        body.description,
        body.event_type,
        body.priority,
      ]
    );

    return Response.json(rows[0] ?? null);
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

    await query(
      `
      UPDATE events
         SET deleted_at = NOW()
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
      `,
      [tenantId, id]
    );

    return Response.json({ success: true, id });
  } catch (err) {
    console.error("DELETE /api/events failed", err);
    return Response.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
