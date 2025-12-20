import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters
   ?id=
   ?session_id=
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const sessionId = searchParams.get("session_id");

  if (id) {
    const result = await query(
      `
      SELECT *
      FROM encounters
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [tenantId, id]
    );

    return Response.json(result.rows[0] || null);
  }

  if (sessionId) {
    const result = await query(
      `
      SELECT *
      FROM encounters
      WHERE tenant_id = $1
        AND session_id = $2
        AND deleted_at IS NULL
      ORDER BY priority DESC, created_at ASC
      `,
      [tenantId, sessionId]
    );

    return Response.json(result.rows);
  }

  return Response.json([]);
}

/* -----------------------------------------------------------
   POST /api/encounters
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();
  const id = uuid();

  if (!body?.session_id || !body?.campaign_id) {
    return Response.json(
      { error: "campaign_id and session_id are required" },
      { status: 400 }
    );
  }

  if (!body?.name || !body.name.trim()) {
    return Response.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO encounters (
      id,
      tenant_id,
      campaign_id,
      session_id,
      name,
      description,
      notes,
      priority,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
    RETURNING *
    `,
    [
      id,
      tenantId,
      body.campaign_id,
      body.session_id,
      body.name.trim(),
      body.description ?? null,
      body.notes ?? null,
      body.priority ?? 0,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api/encounters?id=
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
    UPDATE encounters
       SET name        = COALESCE($3, name),
           description = COALESCE($4, description),
           notes       = COALESCE($5, notes),
           priority    = COALESCE($6, priority),
           updated_at  = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      body.name,
      body.description,
      body.notes,
      body.priority,
    ]
  );

  return Response.json(result.rows[0] || null);
}

/* -----------------------------------------------------------
   DELETE /api/encounters?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  await query(
    `
    UPDATE encounters
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
    `,
    [tenantId, id]
  );

  return Response.json({ ok: true, id });
}
