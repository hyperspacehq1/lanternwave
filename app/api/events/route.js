import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/events
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const sessionId = searchParams.get("session_id");
  let campaignId = searchParams.get("campaign_id");

  if (!campaignId && sessionId) {
    const { rows } = await query(
      `SELECT campaign_id FROM sessions WHERE id = $1`,
      [sessionId]
    );
    campaignId = rows[0]?.campaign_id;
  }

  if (id) {
    const { rows } = await query(
      `
      SELECT *
        FROM events
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       LIMIT 1
      `,
      [tenantId, id]
    );

    return Response.json(
      rows[0]
        ? sanitizeRow(rows[0], {
            name: 200,
            description: 20000,
            searchBody: 20000,
          })
        : null
    );
  }

  if (!campaignId) {
    return Response.json([]);
  }

  const { rows } = await query(
    `
    SELECT *
      FROM events
     WHERE tenant_id = $1
       AND campaign_id = $2
       AND deleted_at IS NULL
     ORDER BY priority ASC, created_at ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 200,
      description: 20000,
      searchBody: 20000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/events
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId ?? null;
  const name = body.name?.trim();

  if (!campaignId) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  if (!name) {
    return Response.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    INSERT INTO events (
      tenant_id,
      campaign_id,
      session_id,
      encounter_id,
      name,
      description,
      event_type,
      priority,
      search_body,
      external_source,
      external_id,
      external_payload
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
    `,
    [
      tenantId,
      campaignId,
      body.session_id ?? body.sessionId ?? null,
      body.encounter_id ?? body.encounterId ?? null,
      name,
      body.description ?? null,
      body.event_type ?? body.eventType ?? null,
      body.priority ?? 0,
      body.search_body ?? body.searchBody ?? null,
      body.external_source ?? body.externalSource ?? null,
      body.external_id ?? body.externalId ?? null,
      body.external_payload ?? body.externalPayload ?? null,
    ]
  );

  return Response.json(
    sanitizeRow(rows[0], {
      name: 200,
      description: 20000,
      searchBody: 20000,
    }),
    { status: 201 }
  );
}

/* -----------------------------------------------------------
   PUT /api/events?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  if ("name" in body && (!body.name || !body.name.trim())) {
    return Response.json(
      { error: "name cannot be blank" },
      { status: 400 }
    );
  }

  const sets = [];
  const values = [tenantId, id];
  let i = 3;

  const map = {
    name: "name",
    description: "description",
    event_type: "event_type",
    eventType: "event_type",
    priority: "priority",
    search_body: "search_body",
    searchBody: "search_body",
    external_source: "external_source",
    externalSource: "external_source",
    external_id: "external_id",
    externalId: "external_id",
    external_payload: "external_payload",
    externalPayload: "external_payload",
  };

  for (const key in map) {
    if (body[key] !== undefined) {
      sets.push(`${map[key]} = $${i++}`);
      values.push(body[key]);
    }
  }

  if (!sets.length) {
    return Response.json(
      { error: "No valid fields provided" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    UPDATE events
       SET ${sets.join(", ")},
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    values
  );

  return Response.json(
    rows[0]
      ? sanitizeRow(rows[0], {
          name: 200,
          description: 20000,
          searchBody: 20000,
        })
      : null
  );
}

/* -----------------------------------------------------------
   DELETE /api/events?id=   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE events
       SET deleted_at = NOW(),
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [tenantId, id]
  );

  return Response.json(
    rows[0]
      ? sanitizeRow(rows[0], {
          name: 200,
          description: 20000,
          searchBody: 20000,
        })
      : null
  );
}
