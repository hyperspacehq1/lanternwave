import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters-npcs?encounter_id=
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
  const encounterId = searchParams.get("encounter_id");

  if (!encounterId) {
    return Response.json({ error: "encounter_id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    SELECT
      en.npc_id,
      n.name,
      n.description
    FROM encounter_npcs en
    JOIN encounters e
      ON e.id = en.encounter_id
     AND e.tenant_id = $1
     AND e.deleted_at IS NULL
    JOIN npcs n
      ON n.id = en.npc_id
     AND n.deleted_at IS NULL
    WHERE en.tenant_id = $1
      AND en.encounter_id = $2
      AND en.deleted_at IS NULL
    ORDER BY en.created_at ASC
    `,
    [tenantId, encounterId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      description: 10000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/encounters-npcs
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
    const { encounter_id, npc_id } = body ?? {};

    if (!encounter_id || !npc_id) {
      return Response.json(
        { error: "encounter_id and npc_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      INSERT INTO encounter_npcs (
        tenant_id,
        encounter_id,
        npc_id,
        created_at
      )
      VALUES ($1, $2, $3, NOW())
      `,
      [tenantId, encounter_id, npc_id]
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/encounters-npcs
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
    const { encounter_id, npc_id } = body ?? {};

    if (!encounter_id || !npc_id) {
      return Response.json(
        { error: "encounter_id and npc_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      UPDATE encounter_npcs
         SET deleted_at = NOW()
       WHERE tenant_id = $1
         AND encounter_id = $2
         AND npc_id = $3
         AND deleted_at IS NULL
      `,
      [tenantId, encounter_id, npc_id]
    );

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
