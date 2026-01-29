import { query } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateString(val, max, field) {
  if (typeof val !== "string") throw new Error(`${field} must be a string`);
  const trimmed = val.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  if (trimmed.length > max) throw new Error(`${field} max ${max} chars`);
  return trimmed;
}

function validateOptionalString(val, max, field) {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") throw new Error(`${field} must be a string`);
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new Error(`${field} max ${max} chars`);
  return trimmed;
}

function validateOptionalInt(val, field) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (!Number.isInteger(n)) throw new Error(`${field} must be an integer`);
  return n;
}

const SANITIZE_SCHEMA = {
  name: 100,
  last_name: 100,
  character_name: 100,
  notes: 2000,
  phone: 50,
  email: 120,
};

/* -----------------------------------------------------------
   GET /api/players
------------------------------------------------------------ */
export async function GET(req) {
  const ctx = await getTenantContext(req);
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
      [ctx.tenantId, id]
    );

    return Response.json(
      rows[0] ? sanitizeRow(rows[0], SANITIZE_SCHEMA) : null
    );
  }

  if (campaignId) {
    const { rows } = await query(
      `
      SELECT *
        FROM players
       WHERE tenant_id = $1
         AND campaign_id = $2
         AND deleted_at IS NULL
       ORDER BY created_at ASC
      `,
      [ctx.tenantId, campaignId]
    );

    return Response.json(sanitizeRows(rows, SANITIZE_SCHEMA));
  }

  return Response.json([]);
}

/* -----------------------------------------------------------
   POST /api/players  ✅ FULLY HYDRATED
------------------------------------------------------------ */
export async function POST(req) {
  const ctx = await getTenantContext(req);
  const body = await req.json();

  if (!body.campaign_id) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

  try {
    const id = uuid();

    const name = validateString(body.name, 100, "name");
    const last_name = validateOptionalString(body.last_name, 100, "last_name");
    const character_name = validateOptionalString(
      body.character_name,
      100,
      "character_name"
    );
    const notes = validateOptionalString(body.notes, 2000, "notes");
    const phone = validateOptionalString(body.phone, 50, "phone");
    const email = validateOptionalString(body.email, 120, "email");

    // 🔑 base sanity: user value OR default (50 via DB)
    const baseSanity = validateOptionalInt(body.sanity, "sanity");

    /* 1️⃣ Create player */
    const { rows } = await query(
      `
      INSERT INTO players (
        id,
        tenant_id,
        campaign_id,
        name,
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
        id,
        ctx.tenantId,
        body.campaign_id,
        name,
        last_name,
        character_name,
        notes,
        phone,
        email,
        baseSanity, // may be null → DB default = 50
      ]
    );

    /* 2️⃣ ALWAYS create player_sanity (Items-style invariant) */
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
      VALUES (
        $1,
        $2,
        $3,
        $4,
        COALESCE($5, 50),
        COALESCE($5, 50),
        NOW(),
        NOW()
      )
      `,
      [
        uuid(),
        ctx.tenantId,
        body.campaign_id,
        id,
        baseSanity,
      ]
    );

    return Response.json(
      sanitizeRow(rows[0], SANITIZE_SCHEMA),
      { status: 201 }
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   PUT /api/players?id=   (no sanity side effects)
------------------------------------------------------------ */
export async function PUT(req) {
  const ctx = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  try {
    const sets = [];
    const values = [ctx.tenantId, id];
    let i = 3;

    const fields = {
      name: 100,
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
      rows[0] ? sanitizeRow(rows[0], SANITIZE_SCHEMA) : null
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/players?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  const ctx = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

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
    [ctx.tenantId, id]
  );

  return Response.json(
    rows[0] ? sanitizeRow(rows[0], SANITIZE_SCHEMA) : null
  );
}

