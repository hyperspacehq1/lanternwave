import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/* -----------------------------------------------------------
   GET /api/sessions
------------------------------------------------------------ */
export async function GET(req) {
  const ctx = await getTenantContext(req);
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id");

  if (!campaignId) return Response.json([]);

  const { rows } = await query(
    `
    SELECT *
      FROM sessions
     WHERE tenant_id = $1
       AND campaign_id = $2
       AND deleted_at IS NULL
     ORDER BY created_at ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      description: 10000,
      notes: 500,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/sessions
------------------------------------------------------------ */
export async function POST(req) {
  const ctx = await getTenantContext(req);
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId ?? null;
  const name = body.name?.trim();
  const description = body.description ?? null;
  const notes = body.notes ?? null;

  if (!campaignId) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  if (name.length > 120) {
    return Response.json({ error: "name max 120 chars" }, { status: 400 });
  }

  if (hasOwn(body, "description")) {
    if (typeof description !== "string" && description !== null) {
      return Response.json({ error: "description must be a string" }, { status: 400 });
    }
    if (description && description.length > 10000) {
      return Response.json({ error: "description too long" }, { status: 400 });
    }
  }

  if (hasOwn(body, "notes")) {
    if (typeof notes !== "string" && notes !== null) {
      return Response.json({ error: "notes must be a string" }, { status: 400 });
    }
    if (notes && notes.length > 500) {
      return Response.json({ error: "notes too long" }, { status: 400 });
    }
  }

  const { rows } = await query(
    `
    INSERT INTO sessions (
      tenant_id,
      campaign_id,
      name,
      description,
      notes
    )
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
    `,
    [tenantId, campaignId, name, description, notes]
  );

  return Response.json(
    sanitizeRow(rows[0], {
      name: 120,
      description: 10000,
      notes: 500,
    }),
    { status: 201 }
  );
}

/* -----------------------------------------------------------
   PUT /api/sessions?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const ctx = await getTenantContext(req);
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
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
    if (String(body.name).length > 120) {
      return Response.json({ error: "name max 120 chars" }, { status: 400 });
    }
  }

  if (hasOwn(body, "description")) {
    if (typeof body.description !== "string" && body.description !== null) {
      return Response.json({ error: "description must be a string" }, { status: 400 });
    }
    if (body.description && body.description.length > 10000) {
      return Response.json({ error: "description too long" }, { status: 400 });
    }
  }

  if (hasOwn(body, "notes")) {
    if (typeof body.notes !== "string" && body.notes !== null) {
      return Response.json({ error: "notes must be a string" }, { status: 400 });
    }
    if (body.notes && body.notes.length > 500) {
      return Response.json({ error: "notes too long" }, { status: 400 });
    }
  }

  const sets = [];
  const values = [tenantId, id];
  let i = 3;

  if (hasOwn(body, "name")) {
    sets.push(`name = $${i++}`);
    values.push(body.name.trim());
  }

  if (hasOwn(body, "description")) {
    sets.push(`description = $${i++}`);
    values.push(body.description ?? null);
  }

  if (hasOwn(body, "notes")) {
    sets.push(`notes = $${i++}`);
    values.push(body.notes ?? null);
  }

  if (!sets.length) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE sessions
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
          name: 120,
          description: 10000,
          notes: 500,
        })
      : null
  );
}

/* -----------------------------------------------------------
   DELETE /api/sessions?id=   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req) {
  const ctx = await getTenantContext(req);
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE sessions
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
          name: 120,
          description: 10000,
          notes: 500,
        })
      : null
  );
}
