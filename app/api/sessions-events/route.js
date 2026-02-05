import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/sessions-events?session_id=
------------------------------------------------------------ */
export async function GET(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return Response.json(
      { error: "session_id required" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    SELECT
      se.event_id,
      e.name,
      e.description
    FROM session_events se
    JOIN events e
      ON e.id = se.event_id
     AND e.deleted_at IS NULL
    WHERE se.tenant_id = $1
      AND se.session_id = $2
      AND se.deleted_at IS NULL
    ORDER BY se.created_at ASC
    `,
    [tenantId, sessionId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      description: 10000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/sessions-events
------------------------------------------------------------ */
export async function POST(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;

  try {
    const body = await req.json();
    const { session_id, event_id } = body ?? {};

    if (!session_id || !event_id) {
      return Response.json(
        { error: "session_id and event_id required" },
        { status: 400 }
      );
    }

    // Get campaign_id from the session
    const sessionResult = await query(
      `SELECT campaign_id FROM sessions WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [session_id, tenantId]
    );

    if (!sessionResult.rows.length) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const campaignId = sessionResult.rows[0].campaign_id;

    await query(
      `
      INSERT INTO session_events (
        tenant_id,
        campaign_id,
        session_id,
        event_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      `,
      [tenantId, campaignId, session_id, event_id]
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/sessions-events
------------------------------------------------------------ */
export async function DELETE(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;

  try {
    const body = await req.json();
    const { session_id, event_id } = body ?? {};

    if (!session_id || !event_id) {
      return Response.json(
        { error: "session_id and event_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      UPDATE session_events
         SET deleted_at = NOW()
       WHERE tenant_id = $1
         AND session_id = $2
         AND event_id = $3
         AND deleted_at IS NULL
      `,
      [tenantId, session_id, event_id]
    );

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}