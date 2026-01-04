// /api/events/[id]/route.js  (FULL, FIXED)

import { sanitizeRow } from "@/lib/api/sanitize";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/* -----------------------------------------------------------
   GET /api/events/[id]
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params?.id;

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

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

/* -----------------------------------------------------------
   PUT /api/events/[id]
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params?.id;
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
      return Response.json(
        { error: "description must be a string" },
        { status: 400 }
      );
    }
    if (body.description && body.description.length > 20000) {
      return Response.json(
        { error: "description too long" },
        { status: 400 }
      );
    }
  }

  if (hasOwn(body, "search_body") || hasOwn(body, "searchBody")) {
    const sb = body.search_body ?? body.searchBody;
    if (typeof sb !== "string" && sb !== null) {
      return Response.json(
        { error: "search_body must be a string" },
        { status: 400 }
      );
    }
    if (sb && sb.length > 20000) {
      return Response.json(
        { error: "search_body too long" },
        { status: 400 }
      );
    }
  }

  if (hasOwn(body, "priority") && !Number.isInteger(body.priority)) {
    return Response.json(
      { error: "priority must be an integer" },
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
   DELETE /api/events/[id]   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params?.id;

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
