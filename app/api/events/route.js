import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/events
   Optional:
     ?id=
     ?session_id=
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    const sessionId = searchParams.get("session_id");

    // Single event by id
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

    // Events for a session
    if (sessionId) {
      const { rows } = await query(
        `
        SELECT *
          FROM events
         WHERE tenant_id = $1
           AND session_id = $2
           AND deleted_at IS NULL
         ORDER BY created_at ASC
        `,
        [tenantId, sessionId]
      );

      return Response.json(rows);
    }

    // IMPORTANT:
    // Campaign Manager list() MUST NEVER ERROR.
    // If no filter is provided, return empty list.
    return Response.json([]);
  } catch (err) {
    console.error("GET /api/events failed", err);
    // Never crash the UI
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

    if (!body?.session_id) {
      return Response.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    // Validate parent session (tenant + soft-delete safe)
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
        session_id,
        name,
        description
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        tenantId,
        body.session_id,
        body.name ?? null,
        body.description ?? null,
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
   (soft delete)
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
