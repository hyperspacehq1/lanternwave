// /api/events/route.js  (FULL, FIXED)

import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { requireAuth } from "@/lib/auth-server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/* -----------------------------------------------------------
   GET /api/events
------------------------------------------------------------ */
export async function GET(req) {
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const { searchParams } = new URL(req.url);

  const campaignId = searchParams.get("campaign_id");
  const id = searchParams.get("id");

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

  if (!campaignId) return Response.json([]);

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
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId ?? null;
  const name = body.name?.trim();
  const description = body.description ?? null;
  const searchBody = body.search_body ?? body.searchBody ?? null;
  const priority = body.priority ?? 0;

  if (!campaignId) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  if (name.length > 200) {
    return Response.json({ error: "name max 200 chars" }, { status: 400 });
  }

  if (hasOwn(body, "description")) {
    if (typeof description !== "string" && description !== null) {
      return Response.json({ error: "description must be a string" }, { status: 400 });
    }
    if (description && description.length > 20000) {
      return Response.json({ error: "description too long" }, { status: 400 });
    }
  }

  if (hasOwn(body, "search_body") || hasOwn(body, "searchBody")) {
    if (typeof searchBody !== "string" && searchBody !== null) {
      return Response.json({ error: "search_body must be a string" }, { status: 400 });
    }
    if (searchBody && searchBody.length > 20000) {
      return Response.json({ error: "search_body too long" }, { status: 400 });
    }
  }

  if (!Number.isInteger(priority)) {
    return Response.json({ error: "priority must be an integer" }, { status: 400 });
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
      search_body
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      tenantId,
      campaignId,
      body.session_id ?? body.sessionId ?? null,
      body.encounter_id ?? body.encounterId ?? null,
      name,
      description,
      body.event_type ?? body.eventType ?? null,
      priority,
      searchBody,
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
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  if (hasOwn(body, "name")) {
    if (!body.name || !String(body.name).trim()) {
      return Response.json({ error: "name cannot be blank" }, { status: 400 });
    }
    if (String(body.name).length > 200) {
      return Response.json({ error: "name max 200 chars" }, { status: 400 });
    }
  }

  if (hasOwn(body, "description")) {
    if (typeof body.description !== "string" && body.description !== null) {
      return Response.json({ error: "description must be a string" }, { status: 400 });
    }
    if (body.description && body.description.length > 20000) {
      return Response.json({ error: "description too long" }, { status: 400 });
    }
  }

  if (hasOwn(body, "search_body") || hasOwn(body, "searchBody")) {
    const sb = body.search_body ?? body.searchBody;
    if (typeof sb !== "string" && sb !== null) {
      return Response.json({ error: "search_body must be a string" }, { status: 400 });
    }
    if (sb && sb.length > 20000) {
      return Response.json({ error: "search_body too long" }, { status: 400 });
    }
  }

  if (hasOwn(body, "priority") && !Number.isInteger(body.priority)) {
    return Response.json({ error: "priority must be an integer" }, { status: 400 });
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
  };

  for (const key in map) {
    if (hasOwn(body, key)) {
      sets.push(`${map[key]} = $${i++}`);
      values.push(body[key] ?? null);
    }
  }

  if (!sets.length) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
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
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
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
