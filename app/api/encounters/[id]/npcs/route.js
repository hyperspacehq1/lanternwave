import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters/:id/npcs
   Returns NPCs appearing in an encounter
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;

  const result = await query(
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
    WHERE en.encounter_id = $1
      AND en.tenant_id = $2
    ORDER BY
      en.initiative_order NULLS LAST,
      n.name ASC
    `,
    [encounterId, tenantId]
  );

  return Response.json(result.rows);
}

/* -----------------------------------------------------------
   POST /api/encounters/:id/npcs
   Body: { npc_id, role?, initiative_order?, is_hidden?, notes? }
------------------------------------------------------------ */
export async function POST(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;
  const body = await req.json();

  if (!body?.npc_id) {
    return Response.json(
      { error: "npc_id is required" },
      { status: 400 }
    );
  }

  // Ensure encounter exists and belongs to tenant
  const encounter = await query(
    `
    SELECT id
    FROM encounters
    WHERE id = $1
      AND tenant_id = $2
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [encounterId, tenantId]
  );

  if (!encounter.rows.length) {
    return Response.json(
      { error: "Invalid encounter" },
      { status: 404 }
    );
  }

  // Ensure NPC exists and belongs to tenant
  const npc = await query(
    `
    SELECT id
    FROM npcs
    WHERE id = $1
      AND tenant_id = $2
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [body.npc_id, tenantId]
  );

  if (!npc.rows.length) {
    return Response.json(
      { error: "Invalid npc_id" },
      { status: 404 }
    );
  }

  // Insert into join table
  const result = await query(
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
    ON CONFLICT (encounter_id, npc_id)
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

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   DELETE /api/encounters/:id/npcs
   Body: { npc_id }
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;
  const body = await req.json();

  if (!body?.npc_id) {
    return Response.json(
      { error: "npc_id is required" },
      { status: 400 }
    );
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

  return Response.json({
    ok: true,
    encounter_id: encounterId,
    npc_id: body.npc_id,
  });
}
