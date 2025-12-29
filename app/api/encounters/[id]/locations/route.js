import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getEncounterTenant(encounterId) {
  const { rows } = await query(
    `SELECT tenant_id FROM encounters WHERE id = $1 AND deleted_at IS NULL`,
    [encounterId]
  );
  return rows[0]?.tenant_id;
}

/* -----------------------------------------------------------
   GET
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const encounterId = params.id;
  const tenantId = await getEncounterTenant(encounterId);
  if (!tenantId) return Response.json({ error: "Encounter not found" }, { status: 404 });

  const { rows } = await query(
    `
    SELECT
      el.id AS join_id,
      el.location_id,
      l.name,
      el.notes,
      el.created_at
    FROM encounter_locations el
    JOIN locations l ON l.id = el.location_id AND l.tenant_id = $2
    WHERE el.encounter_id = $1 AND el.tenant_id = $2
    ORDER BY l.name
    `,
    [encounterId, tenantId]
  );

  return Response.json(sanitizeRows(rows, { name: 120, notes: 10000 }));
}

/* -----------------------------------------------------------
   POST
------------------------------------------------------------ */
export async function POST(req, { params }) {
  const encounterId = params.id;
  const body = await req.json();
  if (!body.location_id) return Response.json({ error: "location_id required" }, { status: 400 });

  const tenantId = await getEncounterTenant(encounterId);
  if (!tenantId) return Response.json({ error: "Encounter not found" }, { status: 404 });

  const { rows } = await query(
    `
    INSERT INTO encounter_locations (
      tenant_id, encounter_id, location_id, notes
    )
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (tenant_id, encounter_id, location_id)
    DO UPDATE SET notes = EXCLUDED.notes, updated_at = NOW()
    RETURNING *
    `,
    [tenantId, encounterId, body.location_id, body.notes ?? null]
  );

  return Response.json(rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   DELETE
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const encounterId = params.id;
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("location_id");

  if (!locationId) return Response.json({ error: "location_id required" }, { status: 400 });

  const tenantId = await getEncounterTenant(encounterId);
  if (!tenantId) return Response.json({ error: "Encounter not found" }, { status: 404 });

  await query(
    `DELETE FROM encounter_locations
     WHERE tenant_id = $1 AND encounter_id = $2 AND location_id = $3`,
    [tenantId, encounterId, locationId]
  );

  return Response.json({ ok: true });
}
