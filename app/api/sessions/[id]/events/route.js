import { query } from "@/lib/db";
import { sanitizeRows } from "@/lib/api/sanitize";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/sessions/[id]/events
------------------------------------------------------------ */
export async function GET(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = params?.id;
if (!sessionId) {
  return Response.json([]);
}

  const { rows } = await query(
    `
    SELECT se.id,
           se.event_id,
           e.name,
           e.description,
           e.event_type,
           e.priority
      FROM session_events se
      JOIN sessions s
        ON s.id = se.session_id
       AND s.tenant_id = $1
       AND s.deleted_at IS NULL
      JOIN events e
        ON e.id = se.event_id
       AND e.deleted_at IS NULL
     WHERE se.session_id = $2
       AND se.deleted_at IS NULL
     ORDER BY se.created_at ASC
    `,
    [ctx.tenantId, sessionId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      description: 10000,
      event_type: 50,
      priority: 20,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/sessions/[id]/events
------------------------------------------------------------ */
export async function POST(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = params?.id;
  const { event_id } = await req.json();

  if (!sessionId || !event_id) {
    return Response.json(
      { error: "session_id and event_id required" },
      { status: 400 }
    );
  }

  await query(
    `
    INSERT INTO session_events (
      tenant_id,
      session_id,
      event_id
    )
    VALUES ($1, $2, $3)
    ON CONFLICT (tenant_id, session_id, event_id)
    DO NOTHING
    `,
    [ctx.tenantId, sessionId, event_id]
  );

  return Response.json({ ok: true });
}

/* -----------------------------------------------------------
   DELETE /api/sessions/[id]/events
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = params?.id;
  const { event_id } = await req.json();

  if (!sessionId || !event_id) {
    return Response.json(
      { error: "session_id and event_id required" },
      { status: 400 }
    );
  }

  await query(
    `
    UPDATE session_events
       SET deleted_at = now()
     WHERE tenant_id = $1
       AND session_id = $2
       AND event_id = $3
       AND deleted_at IS NULL
    `,
    [ctx.tenantId, sessionId, event_id]
  );

  return Response.json({ ok: true });
}
