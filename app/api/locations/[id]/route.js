import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

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

/* -----------------------------------------------------------
   GET /api/locations/[id]
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const id = params?.id;

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

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
          description: 10000,
          notes: 500,
          world: 120,
        })
      : null
  );
}

/* -----------------------------------------------------------
   PUT /api/locations/[id]
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const id = params?.id;
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  try {
    const sets = [];
    const values = [tenantId, id];
    let i = 3;

    const fields = {
      name: 120,
      description: 10000,
      notes: 500,
      world: 120,
    };

    for (const key in fields) {
      if (hasOwn(body, key)) {
        if (body[key] !== null) {
          validateString(body[key], fields[key], key);
        }
        sets.push(`${key} = $${i++}`);
        values.push(body[key] ?? null);
      }
    }

    if (hasOwn(body, "sensory")) {
      sets.push(`sensory = $${i++}`);
      values.push(validateSensory(body.sensory));
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
            notes: 500,
            world: 120,
          })
        : null
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/locations/[id]   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  const id = params?.id;

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
          notes: 500,
          world: 120,
        })
      : null
  );
}
