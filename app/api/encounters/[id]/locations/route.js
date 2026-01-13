import { query } from "@/lib/db";
import { sanitizeRows } from "@/lib/api/sanitize";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters/[id]/locations
------------------------------------------------------------ */
export async function GET(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encounterId = params?.id;
  if (!encounterId) {
    return Response.json({ error: "encounter id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    SELECT el.id,
           el.location_id,
           l.name,
           l.description
      FROM encounter_locations el
      JOIN encounters e
        ON e.id = el.encounter_id
       AND e.tenant_id = $1
       AND e.deleted_at IS NULL
      JOIN locations l
        ON l.id = el.location_id
       AND l.deleted_at IS NULL
     WHERE el.encounter_id = $2
       AND el.deleted_at IS NULL
     ORDER BY el.created_at ASC
    `,
    [ctx.tenantId, encounterId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      description: 10000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/encounters/[id]/locations
------------------------------------------------------------ */
export async function POST(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encounterId = params?.id;
  const { location_id } = await req.json();

  if (!encounterId || !location_id) {
    return Response.json(
      { error: "encounter_id and location_id required" },
      { status: 400 }
    );
  }

  await query(
    `
    INSERT INTO encounter_locations (
      tenant_id,
      encounter_id,
      location_id
    )
    VALUES ($1, $2, $3)
    ON CONFLICT (tenant_id, encounter_id, location_id)
    DO NOTHING
    `,
    [ctx.tenantId, encounterId, location_id]
  );

  return Response.json({ ok: true });
}

/* -----------------------------------------------------------
   DELETE /api/encounters/[id]/locations
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encounterId = params?.id;
  const { location_id } = await req.json();

  if (!encounterId || !location_id) {
    return Response.json(
      { error: "encounter_id and location_id required" },
      { status: 400 }
    );
  }

  await query(
    `
    UPDATE encounter_locations
       SET deleted_at = now()
     WHERE tenant_id = $1
       AND encounter_id = $2
       AND location_id = $3
       AND deleted_at IS NULL
    `,
    [ctx.tenantId, encounterId, location_id]
  );

  return Response.json({ ok: true });
}
