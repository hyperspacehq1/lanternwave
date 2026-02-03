import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateString(value, max, field) {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  if (value.length > max) {
    throw new Error(`${field} max ${max} chars`);
  }
}

function validateSensory(input) {
  if (input === null || input === undefined) return null;
  if (typeof input !== "object") {
    throw new Error("sensory must be an object");
  }
  if (JSON.stringify(input).length > 20000) {
    throw new Error("sensory payload too large");
  }
  return input;
}

function validateColorDetail(input) {
  if (input === null || input === undefined) return null;
  if (typeof input !== "object") {
    throw new Error("color_detail must be an object");
  }
  if (JSON.stringify(input).length > 20000) {
    throw new Error("color_detail payload too large");
  }
  return input;
}

/* -----------------------------------------------------------
   GET /api/locations
------------------------------------------------------------ */
export async function GET(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id");

  if (!campaignId) return Response.json([]);

  const { rows } = await query(
    `
    SELECT *
      FROM locations
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
      notes: 10000,
      world: 2000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/locations
------------------------------------------------------------ */
export async function POST(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId ?? null;
  if (!campaignId) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

  try {
    if (!body.name) throw new Error("name is required");
    validateString(body.name, 120, "name");

    if (hasOwn(body, "description") && body.description !== null)
      validateString(body.description, 10000, "description");

    if (hasOwn(body, "notes") && body.notes !== null)
      validateString(body.notes, 10000, "notes");

    if (hasOwn(body, "world") && body.world !== null)
      validateString(body.world, 2000, "world");

    const addressFields = [
      "addressStreet",
      "addressCity",
      "addressState",
      "addressZip",
      "addressCountry",
    ];

    for (const f of addressFields) {
      if (hasOwn(body, f) && body[f] !== null) {
        validateString(body[f], 120, f);
      }
    }

    const sensory = validateSensory(body.sensory ?? null);
    const colorDetail = validateColorDetail(body.color_detail ?? null);

    const { rows } = await query(
      `
      INSERT INTO locations (
        id,
        tenant_id,
        campaign_id,
        name,
        description,
        notes,
        world,
        address_street,
        address_city,
        address_state,
        address_zip,
        address_country,
        sensory,
        color_detail
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
      `,
      [
        uuid(),
        tenantId,
        campaignId,
        body.name.trim(),
        body.description ?? null,
        body.notes ?? null,
        body.world ?? null,
        body.addressStreet ?? null,
        body.addressCity ?? null,
        body.addressState ?? null,
        body.addressZip ?? null,
        body.addressCountry ?? null,
        sensory,
        colorDetail,
      ]
    );

    return Response.json(
      sanitizeRow(rows[0], {
        name: 120,
        description: 10000,
        notes: 10000,
        world: 2000,
      }),
      { status: 201 }
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   PUT /api/locations?id=
------------------------------------------------------------ */
export async function PUT(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  try {
    const sets = [];
    const values = [tenantId, id];
    let i = 3;

    const stringFields = {
      name: 120,
      description: 10000,
      notes: 10000,
      world: 2000,
      addressStreet: 120,
      addressCity: 120,
      addressState: 120,
      addressZip: 120,
      addressCountry: 120,
    };

    for (const key in stringFields) {
      if (hasOwn(body, key)) {
        if (body[key] !== null) {
          validateString(body[key], stringFields[key], key);
        }
        const col = key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
        sets.push(`${col} = $${i++}`);
        values.push(body[key] ?? null);
      }
    }

    if (hasOwn(body, "sensory")) {
      sets.push(`sensory = $${i++}`);
      values.push(validateSensory(body.sensory));
    }

    if (hasOwn(body, "color_detail")) {
      sets.push(`color_detail = $${i++}`);
      values.push(validateColorDetail(body.color_detail));
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
            description: 10000,
            notes: 10000,
            world: 2000,
          })
        : null
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/locations?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
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
          description: 10000,
          notes: 10000,
          world: 2000,
        })
      : null
  );
}
