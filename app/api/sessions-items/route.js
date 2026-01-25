import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/sessions-items?session_id=
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
      si.item_id,
      i.name,
      i.description
    FROM session_items si
    JOIN items i
      ON i.id = si.item_id
     AND i.deleted_at IS NULL
    WHERE si.tenant_id = $1
      AND si.session_id = $2
      AND si.deleted_at IS NULL
    ORDER BY si.created_at ASC
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
   POST /api/sessions-items
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
    const { session_id, item_id } = body ?? {};

    if (!session_id || !item_id) {
      return Response.json(
        { error: "session_id and item_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      INSERT INTO session_items (
        tenant_id,
        session_id,
        item_id,
        created_at
      )
      VALUES ($1, $2, $3, NOW())
      `,
      [tenantId, session_id, item_id]
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/sessions-items
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
    const { session_id, item_id } = body ?? {};

    if (!session_id || !item_id) {
      return Response.json(
        { error: "session_id and item_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      UPDATE session_items
         SET deleted_at = NOW()
       WHERE tenant_id = $1
         AND session_id = $2
         AND item_id = $3
         AND deleted_at IS NULL
      `,
      [tenantId, session_id, item_id]
    );

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
