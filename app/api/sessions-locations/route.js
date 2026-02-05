import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/sessions-locations?session_id=
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
      sl.location_id,
      l.name,
      l.description
    FROM session_locations sl
    JOIN locations l
      ON l.id = sl.location_id
     AND l.deleted_at IS NULL
    WHERE sl.tenant_id = $1
      AND sl.session_id = $2
      AND sl.deleted_at IS NULL
    ORDER BY sl.created_at ASC
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
   POST /api/sessions-locations
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
    const { session_id, location_id } = body ?? {};

    if (!session_id || !location_id) {
      return Response.json(
        { error: "session_id and location_id required" },
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
      INSERT INTO session_locations (
        tenant_id,
        campaign_id,
        session_id,
        location_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      `,
      [tenantId, campaignId, session_id, location_id]
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/sessions-locations
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
    const { session_id, location_id } = body ?? {};

    if (!session_id || !location_id) {
      return Response.json(
        { error: "session_id and location_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      UPDATE session_locations
         SET deleted_at = NOW()
       WHERE tenant_id = $1
         AND session_id = $2
         AND location_id = $3
         AND deleted_at IS NULL
      `,
      [tenantId, session_id, location_id]
    );

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
