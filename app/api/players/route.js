// ==============================
// /api/players/route.js  (FULL, FIXED)
// ==============================

import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

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
  return validateString(val, max, field);
}

/* -----------------------------------------------------------
   GET /api/players
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
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

  return Response.json(
    sanitizeRows(rows, {
      firstName: 100,
      lastName: 100,
      characterName: 100,
      notes: 2000,
      phone: 50,
      email: 120,
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
  if (!campaignId) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

  try {
    if (!body.first_name && !body.firstName) {
      throw new Error("first_name is required");
    }

    const firstName = validateString(
      body.first_name ?? body.firstName,
      100,
      "first_name"
    );

    const lastName = validateOptionalString(
      body.last_name ?? body.lastName,
      100,
      "last_name"
    );

    const characterName = validateOptionalString(
      body.character_name ?? body.characterName,
      100,
      "character_name"
    );

    const notes = validateOptionalString(
      body.notes,
      2000,
      "notes"
    );

    const phone = validateOptionalString(
      body.phone,
      50,
      "phone"
    );

    const email = validateOptionalString(
      body.email,
      120,
      "email"
    );

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
        email
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        uuid(),
        tenantId,
        campaignId,
        firstName,
        lastName,
        characterName,
        notes,
        phone,
        email,
      ]
    );

    return Response.json(
      sanitizeRow(rows[0], {
        firstName: 100,
        lastName: 100,
        characterName: 100,
        notes: 2000,
        phone: 50,
        email: 120,
      }),
      { status: 201 }
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
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

  try {
    const sets = [];
    const values = [tenantId, id];
    let i = 3;

    const fieldMap = {
      first_name: ["firstName", 100],
      last_name: ["lastName", 100],
      character_name: ["characterName", 100],
      notes: ["notes", 2000],
      phone: ["phone", 50],
      email: ["email", 120],
    };

    for (const col in fieldMap) {
      const [camel, max] = fieldMap[col];
      if (hasOwn(body, col) || hasOwn(body, camel)) {
        const raw = body[col] ?? body[camel];
        const val = validateOptionalString(raw, max, col);
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
      rows[0]
        ? sanitizeRow(rows[0], {
            firstName: 100,
            lastName: 100,
            characterName: 100,
            notes: 2000,
            phone: 50,
            email: 120,
          })
        : null
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
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
          firstName: 100,
          lastName: 100,
          characterName: 100,
          notes: 2000,
          phone: 50,
          email: 120,
        })
      : null
  );
}
