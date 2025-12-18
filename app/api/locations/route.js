import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/locations
   Optional:
     ?id=
     ?event_id=
     ?session_id=
     ?campaign_id=
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const eventId = searchParams.get("event_id");
  const sessionId = searchParams.get("session_id");
  const campaignId = searchParams.get("campaign_id");

  // Single location + events
  if (id) {
    const loc = await query(
      `
      SELECT *
        FROM locations
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       LIMIT 1
      `,
      [tenantId, id]
    );

    if (!loc.rows.length) {
      return Response.json({ error: "Location not found" }, { status: 404 });
    }

    const events = await query(
      `
      SELECT e.*
        FROM event_locations el
        JOIN events e ON e.id = el.event_id
       WHERE el.location_id = $1
         AND e.tenant_id = $2
         AND e.deleted_at IS NULL
       ORDER BY e.created_at ASC
      `,
      [id, tenantId]
    );

    return Response.json({
      ...loc.rows[0],
      events: events.rows,
    });
  }

  // Locations by event
  if (eventId) {
    const out = await query(
      `
      SELECT l.*
        FROM event_locations el
        JOIN locations l ON l.id = el.location_id
       WHERE el.event_id = $1
         AND l.tenant_id = $2
         AND l.deleted_at IS NULL
       ORDER BY l.description ASC
      `,
      [eventId, tenantId]
    );

    return Response.json(out.rows);
  }

  // Locations by session
  if (sessionId) {
    const out = await query(
      `
      SELECT DISTINCT l.*
        FROM event_locations el
        JOIN locations l ON l.id = el.location_id
        JOIN events e ON e.id = el.event_id
       WHERE e.session_id = $1
         AND e.tenant_id = $2
         AND l.tenant_id = $2
         AND e.deleted_at IS NULL
         AND l.deleted_at IS NULL
       ORDER BY l.description ASC
      `,
      [sessionId, tenantId]
    );

    return Response.json(out.rows);
  }

  // Locations by campaign
  if (campaignId) {
    const out = await query(
      `
      SELECT DISTINCT l.*
        FROM event_locations el
        JOIN locations l ON l.id = el.location_id
        JOIN events e ON e.id = el.event_id
       WHERE e.campaign_id = $1
         AND e.tenant_id = $2
         AND l.tenant_id = $2
         AND e.deleted_at IS NULL
         AND l.deleted_at IS NULL
       ORDER BY l.description ASC
      `,
      [campaignId, tenantId]
    );

    return Response.json(out.rows);
  }

  // All locations
  const out = await query(
    `
    SELECT *
      FROM locations
     WHERE tenant_id = $1
       AND deleted_at IS NULL
     ORDER BY description ASC
    `,
    [tenantId]
  );

  return Response.json(out.rows);
}

/* -----------------------------------------------------------
   POST /api/locations
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  if (!body.description || !body.description.trim()) {
    return Response.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO locations (
      tenant_id,
      description,
      street,
      city,
      state,
      zip,
      notes,
      secrets,
      points_of_interest
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      tenantId,
      body.description,
      body.street ?? null,
      body.city ?? null,
      body.state ?? null,
      body.zip ?? null,
      body.notes ?? null,
      body.secrets ?? null,
      body.points_of_interest ?? null,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api/locations?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const body = await req.json();

  const result = await query(
    `
    UPDATE locations
       SET description        = COALESCE($3, description),
           street             = COALESCE($4, street),
           city               = COALESCE($5, city),
           state              = COALESCE($6, state),
           zip                = COALESCE($7, zip),
           notes              = COALESCE($8, notes),
           secrets            = COALESCE($9, secrets),
           points_of_interest = COALESCE($10, points_of_interest),
           updated_at         = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      body.description,
      body.street,
      body.city,
      body.state,
      body.zip,
      body.notes,
      body.secrets,
      body.points_of_interest,
    ]
  );

  if (!result.rows.length) {
    return Response.json({ error: "Location not found" }, { status: 404 });
  }

  return Response.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api/locations?id=
   (soft delete)
------------------------------------------------------------ */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const result = await query(
    `
    UPDATE locations
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING id
    `,
    [tenantId, id]
  );

  if (!result.rows.length) {
    return Response.json({ error: "Location not found" }, { status: 404 });
  }

  return Response.json({ success: true, id });
}
