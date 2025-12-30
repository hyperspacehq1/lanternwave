import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
function pick(body, camel, snake) {
  return body[camel] ?? body[snake];
}

function normalizeSensory(input) {
  if (input == null || input === "") return null;

  if (typeof input === "object") return input;

  try {
    const parsed = JSON.parse(input);
    if (typeof parsed === "object") return parsed;
  } catch {}

  return {
    text: String(input).trim(),
    source: "human",
    updated_at: new Date().toISOString(),
  };
}

/* -----------------------------------------------------------
   GET /api/locations
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
        FROM locations
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
            world: 120,
            description: 10000,
            notes: 10000,
            sensory: 20000,
            addressStreet: 200,
            addressCity: 120,
            addressState: 120,
            addressZip: 40,
            addressCountry: 120,
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
      FROM locations
     WHERE tenant_id = $1
       AND campaign_id = $2
       AND deleted_at IS NULL
     ORDER BY name ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      world: 120,
      description: 10000,
      notes: 10000,
      sensory: 20000,
      addressStreet: 200,
      addressCity: 120,
      addressState: 120,
      addressZip: 40,
      addressCountry: 120,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/locations
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
    INSERT INTO locations (
      tenant_id,
      campaign_id,
      name,
      world,
      description,
      notes,
      sensory,
      address_street,
      address_city,
      address_state,
      address_zip,
      address_country
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
    `,
    [
      tenantId,
      campaignId,
      name,
      body.world ?? null,
      body.description ?? null,
      body.notes ?? null,
      normalizeSensory(body.sensory),
      body.addressStreet ?? null,
      body.addressCity ?? null,
      body.addressState ?? null,
      body.addressZip ?? null,
      body.addressCountry ?? null,
    ]
  );

  return Response.json(
    sanitizeRow(rows[0], {
      name: 120,
      world: 120,
      description: 10000,
      notes: 10000,
      sensory: 20000,
      addressStreet: 200,
      addressCity: 120,
      addressState: 120,
      addressZip: 40,
      addressCountry: 120,
    }),
    { status: 201 }
  );
}

/* -----------------------------------------------------------
   PUT /api/locations?id=
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

  if (body.world !== undefined) {
    sets.push(`world = $${i++}`);
    values.push(body.world);
  }

  if (body.description !== undefined) {
    sets.push(`description = $${i++}`);
    values.push(body.description);
  }

  if (body.notes !== undefined) {
    sets.push(`notes = $${i++}`);
    values.push(body.notes);
  }

  if (body.sensory !== undefined) {
    sets.push(`sensory = $${i++}`);
    values.push(normalizeSensory(body.sensory));
  }

  if (body.addressStreet !== undefined) {
    sets.push(`address_street = $${i++}`);
    values.push(body.addressStreet);
  }

  if (body.addressCity !== undefined) {
    sets.push(`address_city = $${i++}`);
    values.push(body.addressCity);
  }

  if (body.addressState !== undefined) {
    sets.push(`address_state = $${i++}`);
    values.push(body.addressState);
  }

  if (body.addressZip !== undefined) {
    sets.push(`address_zip = $${i++}`);
    values.push(body.addressZip);
  }

  if (body.addressCountry !== undefined) {
    sets.push(`address_country = $${i++}`);
    values.push(body.addressCountry);
  }

  if (!sets.length) {
    return Response.json(
      { error: "No valid fields provided" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    UPDATE locations
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
          world: 120,
          description: 10000,
          notes: 10000,
          sensory: 20000,
          addressStreet: 200,
          addressCity: 120,
          addressState: 120,
          addressZip: 40,
          addressCountry: 120,
        })
      : null
  );
}

/* -----------------------------------------------------------
   DELETE /api/locations?id=   (SOFT DELETE)
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
    UPDATE locations
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
          world: 120,
          description: 10000,
          notes: 10000,
          sensory: 20000,
          addressStreet: 200,
          addressCity: 120,
          addressState: 120,
          addressZip: 40,
          addressCountry: 120,
        })
      : null
  );
}
