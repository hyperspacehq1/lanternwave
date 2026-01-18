import { sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/locations-items?location_id=
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
      li.item_id,
      i.name,
      i.description
    FROM location_items li
    JOIN locations l
      ON l.id = li.location_id
     AND l.tenant_id = $1
     AND l.deleted_at IS NULL
    JOIN items i
      ON i.id = li.item_id
     AND i.deleted_at IS NULL
    WHERE li.tenant_id = $1
      AND li.location_id = $2
      AND li.deleted_at IS NULL
    ORDER BY li.created_at ASC
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
   POST /api/locations-items
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
    const { location_id, item_id } = body ?? {};

    if (!location_id || !item_id) {
      return Response.json(
        { error: "location_id and item_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      INSERT INTO location_items (
        tenant_id,
        location_id,
        item_id,
        created_at
      )
      VALUES ($1, $2, $3, NOW())
      `,
      [tenantId, location_id, item_id]
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/locations-items
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
    const { location_id, item_id } = body ?? {};

    if (!location_id || !item_id) {
      return Response.json(
        { error: "location_id and item_id required" },
        { status: 400 }
      );
    }

    await query(
      `
      UPDATE location_items
         SET deleted_at = NOW()
       WHERE tenant_id = $1
         AND location_id = $2
         AND item_id = $3
         AND deleted_at IS NULL
      `,
      [tenantId, location_id, item_id]
    );

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
