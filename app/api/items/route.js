import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

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

    if (!result.rows.length) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    return Response.json(result.rows[0]);
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

  if (!body.name || !body.name.trim()) {
    return Response.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO items (
      tenant_id,
      name,
      description
    )
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [
      tenantId,
      body.name,
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
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const body = await req.json();

  const result = await query(
    `
    UPDATE items
       SET name        = COALESCE($3, name),
           description = COALESCE($4, description),
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
    ]
  );

  if (!result.rows.length) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  return Response.json(result.rows[0]);
}

/
