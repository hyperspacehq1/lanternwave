import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/locations-npcs?location_id=
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
  const locationId = searchParams.get("location_id");

  if (!locationId) {
    return Response.json({ error: "location_id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    SELECT
      ln.npc_id,
      n.name,
      n.description
    FROM location_npcs ln
    JOIN locations l
      ON l.id = ln.location_id
     AND l.tenant_id = $1
     AND l.deleted_at IS NULL
    JOIN npcs n
      ON n.id = ln.npc_id
     AND n.deleted_at IS NULL
    WHERE ln.tenant_id = $1
      AND ln.location_id = $2
      AND ln.deleted_at IS NULL
    ORDER BY ln.created_at ASC
    `,
    [tenantId, locationId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      description: 10000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/locations-npcs
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
    const { location_id, npc_id } = body ?? {};

    if (!location_id || !npc_id) {
      return Response.json(
        { error: "location_id and npc_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      INSERT INTO location_npcs (
        tenant_id,
        location_id,
        npc_id,
        created_at
      )
      VALUES ($1, $2, $3, NOW())
      `,
      [tenantId, location_id, npc_id]
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/locations-npcs
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
    const { location_id, npc_id } = body ?? {};

    if (!location_id || !npc_id) {
      return Response.json(
        { error: "location_id and npc_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      UPDATE location_npcs
         SET deleted_at = NOW()
       WHERE tenant_id = $1
         AND location_id = $2
         AND npc_id = $3
         AND deleted_at IS NULL
      `,
      [tenantId, location_id, npc_id]
    );

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
