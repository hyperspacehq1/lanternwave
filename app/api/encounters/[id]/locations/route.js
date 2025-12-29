import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;

  const { rows } = await query(
    `
    SELECT
      el.id AS join_id,
      el.location_id,
      l.name,
      el.notes,
      el.created_at
    FROM encounter_locations el
    JOIN locations l ON l.id = el.location_id
    JOIN encounters e ON e.id = el.encounter_id
    WHERE e.tenant_id = $2
      AND el.encounter_id = $1
    `,
    [encounterId, tenantId]
  );

  return Response.json(sanitizeRows(rows));
}

export async function POST(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;
  const body = await req.json();

  if (!body?.location_id) {
    return Response.json({ error: "location_id is required" }, { status: 400 });
  }

  const exists = await query(
    `SELECT 1 FROM encounters WHERE id = $1 AND tenant_id = $2`,
    [encounterId, tenantId]
  );
  if (!exists.rowCount) {
    return Response.json({ error: "Encounter not found" }, { status: 404 });
  }

  const { rows } = await query(
    `
    INSERT INTO encounter_locations (
      tenant_id,
      encounter_id,
      location_id,
      notes
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

export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;
  const locationId = new URL(req.url).searchParams.get("location_id");

  if (!locationId) {
    return Response.json({ error: "location_id is required" }, { status: 400 });
  }

  await query(
    `
    DELETE FROM encounter_locations
     WHERE tenant_id = $1
       AND encounter_id = $2
       AND location_id = $3
    `,
    [tenantId, encounterId, locationId]
  );

  return Response.json({ ok: true });
}
