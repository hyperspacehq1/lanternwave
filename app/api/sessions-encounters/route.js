import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/sessions-encounters?session_id=
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
      se.encounter_id,
      e.name,
      e.description
    FROM session_encounters se
    JOIN encounters e
      ON e.id = se.encounter_id
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
   POST /api/sessions-encounters
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
    const { session_id, encounter_id } = body ?? {};

    if (!session_id || !encounter_id) {
      return Response.json(
        { error: "session_id and encounter_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      INSERT INTO session_encounters (
        tenant_id,
        session_id,
        encounter_id,
        created_at
      )
      VALUES ($1, $2, $3, NOW())
      `,
      [tenantId, session_id, encounter_id]
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/sessions-encounters
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
    const { session_id, encounter_id } = body ?? {};

    if (!session_id || !encounter_id) {
      return Response.json(
        { error: "session_id and encounter_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      UPDATE session_encounters
         SET deleted_at = NOW()
       WHERE tenant_id = $1
         AND session_id = $2
         AND encounter_id = $3
         AND deleted_at IS NULL
      `,
      [tenantId, session_id, encounter_id]
    );

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
