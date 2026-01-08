import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
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
}

function validateProperties(input) {
  if (input === null || input === undefined) return null;
  if (typeof input !== "object") {
    throw new Error("properties must be an object");
  }
  const size = JSON.stringify(input).length;
  if (size > 20000) {
    throw new Error("properties payload too large");
  }
  return input;
}

/* -----------------------------------------------------------
   GET /api/items/[id]
------------------------------------------------------------ */
export async function GET(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const id = params?.id;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { rows } = await query(
    `
    SELECT *
      FROM items
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
          itemType: 120,
        })
      : null
  );
}

/* -----------------------------------------------------------
   PUT /api/items/[id]
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
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

    const fields = {
      name: 120,
      description: 10000,
      notes: 500,
      itemType: 120,
    };

    for (const key in fields) {
      if (hasOwn(body, key)) {
        if (body[key] !== null) validateString(body[key], fields[key], key);
        const col = key === "itemType" ? "item_type" : key;
        sets.push(`${col} = $${i++}`);
        values.push(body[key] ?? null);
      }
    }

    if (hasOwn(body, "properties")) {
      sets.push(`properties = $${i++}`);
      values.push(validateProperties(body.properties));
    }

    if (!sets.length) {
      return Response.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    const { rows } = await query(
      `
      UPDATE items
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
            itemType: 120,
          })
        : null
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/items/[id]   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const id = params?.id;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { rows } = await query(
    `
    UPDATE items
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
          itemType: 120,
        })
      : null
  );
}
