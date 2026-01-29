import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { sanitizeRow } from "@/lib/api/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SANITIZE_SCHEMA = {
  name: 100,
  last_name: 100,
  character_name: 100,
  notes: 2000,
  phone: 50,
  email: 120,
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

    const fields = {
      name: "string",
      last_name: "string",
      character_name: "string",
      notes: "string",
      phone: "string",
      email: "string",
      sanity: "int",          // base sanity
      current_sanity: "int",  // live sanity
    };

    for (const col in fields) {
      if (!Object.prototype.hasOwnProperty.call(body, col)) continue;

      if (fields[col] === "int") {
        const val =
          body[col] === null || body[col] === undefined
            ? 0
            : Number(body[col]);

        if (!Number.isInteger(val)) {
          return Response.json(
            { error: `${col} must be an integer` },
            { status: 400 }
          );
        }

        sets.push(`${col} = $${i++}`);
        values.push(val);
      } else {
        const val =
          body[col] === null
            ? null
            : typeof body[col] === "string"
            ? body[col].trim()
            : null;

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
