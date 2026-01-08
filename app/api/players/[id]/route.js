// ==============================
// /api/players/[id]/route.js  (FULL, FIXED)
// ==============================

import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";

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
   GET /api/players/[id]
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const session = await getTenantContext(req);
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
  const id = params?.id;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

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

/* -----------------------------------------------------------
   PUT /api/players/[id]
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  const session = await getTenantContext(req);
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
  const id = params?.id;
  const body = await req.json();

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

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
   DELETE /api/players/[id]   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const session = await getTenantContext(req);
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
  const id = params?.id;

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
