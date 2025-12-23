import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/encounters
   - ?id=... (single)
   - ?campaign_id=... (list by campaign)
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  if (id) {
    const { rows } = await query(
      `
      SELECT id, campaign_id, name, description, created_at, updated_at
        FROM encounters
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
            name: 120,
            description: 10000,
          })
        : null
    );
  }

  if (campaignId) {
    const { rows } = await query(
      `
      SELECT id, campaign_id, name, description, created_at, updated_at
        FROM encounters
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
      })
    );
  }

  return Response.json([]);
}

/* -----------------------------------------------------------
   POST /api/encounters
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
    INSERT INTO encounters (
      id,
      tenant_id,
      campaign_id,
      name,
      description,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
    RETURNING *
    `,
    [
      uuid(),
      tenantId,
      campaignId,
      name,
      body.description ?? null,
    ]
  );

  return Response.json(
    sanitizeRow(rows[0], {
      name: 120,
      description: 10000,
    }),
    { status: 201 }
  );
}

/* -----------------------------------------------------------
   PUT /api/encounters?id=
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

  if (body.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(body.name.trim());
  }

  if (body.description !== undefined) {
    sets.push(`description = $${i++}`);
    values.push(body.description);
  }

  if (!sets.length) {
    return Response.json(
      { error: "No valid fields provided" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    UPDATE encounters
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
        })
      : null
  );
}

/* -----------------------------------------------------------
   DELETE /api/encounters?id=   (SOFT DELETE)
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
    UPDATE encounters
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
        })
      : null
  );
}
