import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/getTenantContext";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/items
   Optional: ?id=
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const result = await query(
      `
      SELECT *
      FROM items
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [tenantId, id]
    );

    return Response.json(result.rows[0] || null);
  }

  const list = await query(
    `
    SELECT *
    FROM items
    WHERE tenant_id = $1
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    `,
    [tenantId]
  );

  return Response.json(list.rows);
}

/* -----------------------------------------------------------
   POST /api/items
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);

  const body = await req.json();
  const id = uuid();

  const result = await query(
    `
    INSERT INTO items (
      id,
      tenant_id,
      name,
      description,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING *
    `,
    [
      id,
      tenantId,
      body.name ?? null,
      body.description ?? null,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api/items?id=
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
    UPDATE items
       SET name        = $3,
           description = $4,
           updated_at  = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      body.name ?? null,
      body.description ?? null,
    ]
  );

  if (!result.rows.length) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api/items?id=
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
    UPDATE items
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING id
    `,
    [tenantId, id]
  );

  if (!result.rows.length) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
