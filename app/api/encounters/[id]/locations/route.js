import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters/:id/locations
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;

  const result = await query(
    `
    SELECT
      el.id              AS join_id,
      el.location_id,
      l.name,
      el.notes,
      el.created_at
    FROM encounter_locations el
    JOIN locations l
      ON l.id = el.location_id
     AND l.deleted_at IS NULL
    JOIN encounters e
      ON e.id = el.encounter_id
     AND e.tenant_id = $1
    WHERE el.encounter_id = $2
    ORDER BY l.name ASC
    `,
    [tenantId, encounterId]
  );

  return Response.json(result.rows);
}

/* -----------------------------------------------------------
   POST /api/encounters/:id/locations
------------------------------------------------------------ */
export async function POST(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;
  const body = await req.json();

  if (!body.location_id) {
    return Response.json(
      { error: "location_id is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO encounter_locations (
      tenant_id,
      encounter_id,
      location_id,
      notes
    )
    SELECT
      $1,
      $2,
      $3,
      $4
    WHERE EXISTS (
      SELECT 1
      FROM encounters
      WHERE id = $2 AND tenant_id = $1
    )
    AND EXISTS (
      SELECT 1
      FROM locations
      WHERE id = $3 AND tenant_id = $1 AND deleted_at IS NULL
    )
    ON CONFLICT (encounter_id, location_id)
    DO UPDATE SET
      notes = EXCLUDED.notes
    RETURNING *
    `,
    [
      tenantId,
      encounterId,
      body.location_id,
      body.notes ?? null,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   DELETE /api/encounters/:id/locations?location_id=
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const encounterId = params.id;
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("location_id");

  if (!locationId) {
    return Response.json(
      { error: "location_id is required" },
      { status: 400 }
    );
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

  return Response.json({ success: true });
}
