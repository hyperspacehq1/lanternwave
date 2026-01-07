import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";;

/* -----------------------------------------------------------
   GET /api/encounters/:id/npcs
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const encounterId = params.id;

  const { rows } = await query(
    `
    SELECT
      en.id              AS encounter_npc_id,
      en.role,
      en.initiative_order,
      en.is_hidden,
      en.notes,
      n.*
    FROM encounter_npcs en
    JOIN npcs n
      ON n.id = en.npc_id
     AND n.deleted_at IS NULL
     AND n.tenant_id = $2
    JOIN encounters e
      ON e.id = en.encounter_id
     AND e.tenant_id = $2
    WHERE en.encounter_id = $1
      AND en.tenant_id = $2
    ORDER BY
      en.initiative_order NULLS LAST,
      n.name ASC
    `,
    [encounterId, tenantId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      description: 10000,
      notes: 10000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/encounters/:id/npcs
------------------------------------------------------------ */
export async function POST(req, { params }) {
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const encounterId = params.id;
  const body = await req.json();

  if (!body?.npc_id) {
    return Response.json({ error: "npc_id is required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    INSERT INTO encounter_npcs (
      tenant_id,
      encounter_id,
      npc_id,
      role,
      initiative_order,
      is_hidden,
      notes
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (tenant_id, encounter_id, npc_id)
    DO UPDATE SET
      role = EXCLUDED.role,
      initiative_order = EXCLUDED.initiative_order,
      is_hidden = EXCLUDED.is_hidden,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *
    `,
    [
      tenantId,
      encounterId,
      body.npc_id,
      body.role ?? null,
      body.initiative_order ?? null,
      body.is_hidden ?? false,
      body.notes ?? null,
    ]
  );

  return Response.json(rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   DELETE /api/encounters/:id/npcs
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const encounterId = params.id;
  const body = await req.json();

  if (!body?.npc_id) {
    return Response.json({ error: "npc_id is required" }, { status: 400 });
  }

  await query(
    `
    DELETE FROM encounter_npcs
     WHERE tenant_id = $1
       AND encounter_id = $2
       AND npc_id = $3
    `,
    [tenantId, encounterId, body.npc_id]
  );

  return Response.json({ ok: true }, { status: 200 });
}
