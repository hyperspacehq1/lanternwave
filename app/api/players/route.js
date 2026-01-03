import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/players
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  if (id) {
    const { rows } = await query(
      `
      SELECT *
        FROM players
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
            first_name: 120,
            last_name: 120,
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
      FROM players
     WHERE tenant_id = $1
       AND campaign_id = $2
       AND deleted_at IS NULL
     ORDER BY first_name ASC, last_name ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(
    sanitizeRows(rows, {
      first_name: 120,
      last_name: 120,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/players
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId ?? null;
  const firstName = body.first_name ?? body.firstName;
  const lastName = body.last_name ?? body.lastName ?? null;

  if (!campaignId) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  if (!firstName || !firstName.trim()) {
    return Response.json(
      { error: "first_name is required" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    INSERT INTO players (
      tenant_id,
      campaign_id,
      first_name,
      last_name
    )
    VALUES ($1,$2,$3,$4)
    RETURNING *
    `,
    [
      tenantId,
      campaignId,
      firstName.trim(),
      lastName?.trim() ?? null,
    ]
  );

  return Response.json(
    sanitizeRow(rows[0], {
      first_name: 120,
      last_name: 120,
    }),
    { status: 201 }
  );
}

/* -----------------------------------------------------------
   PUT /api/players?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const sets = [];
  const values = [tenantId, id];
  let i = 3;

  if (body.first_name !== undefined || body.firstName !== undefined) {
    const value = body.first_name ?? body.firstName;
    if (!value || !value.trim()) {
      return Response.json(
        { error: "first_name cannot be blank" },
        { status: 400 }
      );
    }
    sets.push(`first_name = $${i++}`);
    values.push(value.trim());
  }

  if (body.last_name !== undefined || body.lastName !== undefined) {
    sets.push(`last_name = $${i++}`);
    values.push(body.last_name ?? body.lastName ?? null);
  }

  if (!sets.length) {
    return Response.json(
      { error: "No valid fields provided" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    UPDATE players
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
          first_name: 120,
          last_name: 120,
        })
      : null
  );
}

/* -----------------------------------------------------------
   DELETE /api/players?id=   (SOFT DELETE)
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
    UPDATE players
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
          first_name: 120,
          last_name: 120,
        })
      : null
  );
}
