import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { sanitizeRow } from "@/lib/api/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateRequiredString(val, max, field) {
  if (typeof val !== "string") {
    throw new Error(`${field} must be a string`);
  }
  const trimmed = val.trim();
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }
  if (trimmed.length > max) {
    throw new Error(`${field} max ${max} chars`);
  }
  return trimmed;
}

// ✅ Items-style optional string handling
function parseOptionalString(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed || null;
}

function parseOptionalInt(val, field) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  if (!Number.isInteger(n)) {
    throw new Error(`${field} must be an integer`);
  }
  return n;
}

const SANITIZE_SCHEMA = {
  name: 100,
  last_name: 100,
  character_name: 100,
  sanity: true,
  current_sanity: true,
  notes: 2000,
  phone: 50,
  email: 120,
  initiative_score: true,
  initiative_bonus: true,
};

/* -----------------------------------------------------------
   GET /api/players/[id]
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const ctx = await getTenantContext(req);
  const id = params?.id;

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

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

/* -----------------------------------------------------------
   PUT /api/players/[id]
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  const ctx = await getTenantContext(req);
  const id = params?.id;
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  try {
    const sets = [];
    const values = [ctx.tenantId, id];
    let i = 3;

    // ✅ name optional on PUT, but must be valid if present
    if (hasOwn(body, "name")) {
      sets.push(`name = $${i++}`);
      values.push(validateRequiredString(body.name, 100, "name"));
    }

    // ✅ optional strings — EXACT Items behavior
    const optionalStrings = [
      "last_name",
      "character_name",
      "notes",
      "phone",
      "email",
    ];

    for (const field of optionalStrings) {
      if (!hasOwn(body, field)) continue;
      sets.push(`${field} = $${i++}`);
      values.push(parseOptionalString(body[field]));
    }

    // ✅ optional ints
    const optionalInts = [
      "sanity",
      "current_sanity",
      "initiative_score",
      "initiative_bonus",
    ];

    for (const field of optionalInts) {
      if (!hasOwn(body, field)) continue;
      sets.push(`${field} = $${i++}`);
      values.push(parseOptionalInt(body[field], field));
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
   DELETE /api/players/[id]
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const ctx = await getTenantContext(req);
  const id = params?.id;

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
    [ctx.tenantId, id]
  );

  return Response.json(
    rows[0] ? sanitizeRow(rows[0], SANITIZE_SCHEMA) : null
  );
}
