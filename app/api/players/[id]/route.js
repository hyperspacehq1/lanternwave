import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
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
   GET /api/players/[id]
------------------------------------------------------------ */
/* -----------------------------------------------------------
   GET /api/players?id=
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
  const id = searchParams.get("id");

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
    [tenantId, id]
  );

  return Response.json(rows[0] ?? null);
}

/* -----------------------------------------------------------
   PUT /api/players/[id]
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

    // keep player_sanity.base_sanity in sync
    if (hasOwn(body, "sanity") && Number.isInteger(rows[0]?.sanity)) {
      await query(
        `
        UPDATE player_sanity
           SET base_sanity = $1,
               updated_at = NOW()
         WHERE tenant_id = $2
           AND player_id = $3
        `,
        [rows[0].sanity, tenantId, rows[0].id]
      );
    }

    return Response.json(rows[0] ?? null);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/players/[id]
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
