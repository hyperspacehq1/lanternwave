import { query } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateString(val, max, field) {
  if (typeof val !== "string") {
    throw new Error(`${field} must be a string`);
  }
  if (val.length > max) {
    throw new Error(`${field} max ${max} chars`);
  }
  return val.trim();
}

function validateOptionalString(val, max, field) {
  if (val === null || val === undefined) return null;

  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    if (trimmed.length > max) {
      throw new Error(`${field} max ${max} chars`);
    }
    return trimmed;
  }

  throw new Error(`${field} must be a string`);
}

function validateOptionalInt(val, field) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (!Number.isInteger(n)) {
    throw new Error(`${field} must be an integer`);
  }
  return n;
}

/* -----------------------------------------------------------
   GET /api/players
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
      FROM players
     WHERE tenant_id = $1
       AND campaign_id = $2
       AND deleted_at IS NULL
     ORDER BY created_at ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(rows);
}

/* -----------------------------------------------------------
   POST /api/players
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

  const campaignId = body.campaign_id ?? null;
  if (!campaignId) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

  try {
    if (!body.first_name) {
      throw new Error("first_name is required");
    }

    const firstName = validateString(body.first_name, 100, "first_name");
    const lastName = validateOptionalString(body.last_name, 100, "last_name");
    const characterName = validateOptionalString(
      body.character_name,
      100,
      "character_name"
    );
    const notes = validateOptionalString(body.notes, 2000, "notes");
    const phone = validateOptionalString(body.phone, 50, "phone");
    const email = validateOptionalString(body.email, 120, "email");
    const sanity = validateOptionalInt(body.sanity, "sanity");

    const playerId = uuid();

    const { rows } = await query(
      `
      INSERT INTO players (
        id,
        tenant_id,
        campaign_id,
        first_name,
        last_name,
        character_name,
        notes,
        phone,
        email,
        sanity
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        playerId,
        tenantId,
        campaignId,
        firstName,
        lastName,
        characterName,
        notes,
        phone,
        email,
        sanity,
      ]
    );

    if (Number.isInteger(sanity)) {
      await query(
        `
        INSERT INTO player_sanity (
          id,
          tenant_id,
          campaign_id,
          player_id,
          base_sanity,
          current_sanity,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$5,NOW(),NOW())
        `,
        [uuid(), tenantId, campaignId, playerId, sanity]
      );
    }

    return Response.json(rows[0], { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   PUT /api/players?id=
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

    const fields = {
      first_name: 100,
      last_name: 100,
      character_name: 100,
      notes: 2000,
      phone: 50,
      email: 120,
    };

    for (const col in fields) {
      if (hasOwn(body, col)) {
        const val = validateOptionalString(body[col], fields[col], col);
        sets.push(`${col} = $${i++}`);
        values.push(val);
      }
    }

    if (hasOwn(body, "sanity")) {
      const val = validateOptionalInt(body.sanity, "sanity");
      sets.push(`sanity = $${i++}`);
      values.push(val);
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

    return Response.json(rows[0] ?? null);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/players?id=
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

  return Response.json(rows[0] ?? null);
}
