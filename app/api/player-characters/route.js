import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/player-characters
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const row = await query(
      `
      SELECT *
      FROM player_characters
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [tenantId, id]
    );
    return Response.json(row.rows[0] || null);
  }

  const list = await query(
    `
    SELECT *
    FROM player_characters
    WHERE tenant_id = $1
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    `,
    [tenantId]
  );

  return Response.json(list.rows);
}

/* -----------------------------------------------------------
   POST /api/player-characters
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();
  const id = uuid();

  const result = await query(
    `
    INSERT INTO player_characters (
      id,
      tenant_id,
      first_name,
      last_name,
      phone,
      email,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
    RETURNING *
    `,
    [
      id,
      tenantId,
      body.first_name ?? "",
      body.last_name ?? "",
      body.phone ?? "",
      body.email ?? "",
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api/player-characters?id=
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
    UPDATE player_characters
       SET first_name = COALESCE($3, first_name),
           last_name  = COALESCE($4, last_name),
           phone      = COALESCE($5, phone),
           email      = COALESCE($6, email),
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      body.first_name,
      body.last_name,
      body.phone,
      body.email,
    ]
  );

  if (!result.rows.length) {
    return Response.json({ error: "Player character not found" }, { status: 404 });
  }

  return Response.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api/player-characters?id=
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
    UPDATE player_characters
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING id
    `,
    [tenantId, id]
  );

  if (!result.rows.length) {
    return Response.json({ error: "Player character not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
