import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/events
   Optional: ?id= OR ?session_id=
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const sessionId = searchParams.get("session_id");

  if (id) {
    const result = await query(
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

    if (!result.rows.length) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    return Response.json(result.rows[0]);
  }

  if (sessionId) {
    const result = await query(
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

    return Response.json(result.rows);
  }

  return Response.json(
    { error: "Either id or session_id is required" },
    { status: 400 }
  );
}

/* -----------------------------------------------------------
   POST /api/events
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  if (!body.session_id) {
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

  const result = await query(
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

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api/events?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const body = await req.json();

  const result = await query(
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

  if (!result.rows.length) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  return Response.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api/events?id=
   (soft delete)
------------------------------------------------------------ */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const result = await query(
    `
    UPDATE events
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING id
    `,
    [tenantId, id]
  );

  if (!result.rows.length) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  return Response.json({ success: true, id });
}
