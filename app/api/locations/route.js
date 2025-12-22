import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   Helpers
------------------------------------------------------------ */
function pick(body, camel, snake) {
  return body[camel] ?? body[snake] ?? null;
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
    const result = await query(
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
    return Response.json(result.rows[0] || null);
  }

  if (!campaignId) {
    return Response.json([]);
  }

  const list = await query(
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

  return Response.json(list.rows);
}

/* -----------------------------------------------------------
   POST /api/locations
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const name = pick(body, "name", "name");
  const description = pick(body, "description", "description");
  const notes = pick(body, "notes", "notes");
  const sensory = normalizeSensory(pick(body, "sensory", "sensory"));
  const world = pick(body, "world", "world");

  const address_street = pick(body, "addressStreet", "address_street");
  const address_city = pick(body, "addressCity", "address_city");
  const address_state = pick(body, "addressState", "address_state");
  const address_zip = pick(body, "addressZip", "address_zip");
  const address_country = pick(body, "addressCountry", "address_country");

  const campaignId =
    body.campaign_id ?? body.campaignId ?? null;

  if (!campaignId) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  if (!name || !name.trim()) {
    return Response.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO locations (
      tenant_id,
      campaign_id,
      name,
      description,
      notes,
      sensory,
      world,
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
      name.trim(),
      description,
      notes,
      sensory,
      world,
      address_street,
      address_city,
      address_state,
      address_zip,
      address_country,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
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

  const result = await query(
    `
    UPDATE locations
       SET name            = COALESCE($3, name),
           description     = COALESCE($4, description),
           notes           = COALESCE($5, notes),
           sensory         = COALESCE($6, sensory),
           world           = COALESCE($7, world),
           address_street  = COALESCE($8, address_street),
           address_city    = COALESCE($9, address_city),
           address_state   = COALESCE($10, address_state),
           address_zip     = COALESCE($11, address_zip),
           address_country = COALESCE($12, address_country),
           updated_at      = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      pick(body, "name", "name"),
      pick(body, "description", "description"),
      pick(body, "notes", "notes"),
      normalizeSensory(pick(body, "sensory", "sensory")),
      pick(body, "world", "world"),
      pick(body, "addressStreet", "address_street"),
      pick(body, "addressCity", "address_city"),
      pick(body, "addressState", "address_state"),
      pick(body, "addressZip", "address_zip"),
      pick(body, "addressCountry", "address_country"),
    ]
  );

  return Response.json(result.rows[0] || null);
}
