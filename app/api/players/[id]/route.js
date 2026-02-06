import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { sanitizeRow } from "@/lib/api/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateRequiredString(val, max, field) {
  if (typeof val !== "string") throw new Error(`${field} must be a string`);
  const trimmed = val.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  if (trimmed.length > max) throw new Error(`${field} max ${max} chars`);
  return trimmed;
}

function parseOptionalString(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed || null;
}

function parseOptionalInt(val, field) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  if (!Number.isInteger(n)) throw new Error(`${field} must be an integer`);
  return n;
}

const PLAYER_SANITIZE = {
  name: 100,
  last_name: 500,
  character_name: 500,
  sanity: true,
  current_sanity: true,
  notes: 2000,
  phone: 50,
  email: 120,
  initiative_score: true,
  initiative_bonus: true,
  initiative_current: true,
};

/* -------- GET -------- */
export async function GET(req, { params }) {
  const ctx = await getTenantContext(req);
  const id = params?.id;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { rows } = await query(
    `SELECT *
       FROM players
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      LIMIT 1`,
    [ctx.tenantId, id]
  );

  return Response.json(
    rows[0] ? sanitizeRow(rows[0], PLAYER_SANITIZE) : null
  );
}

/* -------- PUT -------- */
export async function PUT(req, { params }) {
  const ctx = await getTenantContext(req);
  const id = params?.id;
  const body = await req.json();

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  try {
    const sets = [];
    const values = [ctx.tenantId, id];
    let i = 3;

    if (hasOwn(body, "name")) {
      sets.push(`name = $${i++}`);
      values.push(validateRequiredString(body.name, 100, "name"));
    }

    for (const f of ["last_name","character_name","notes","phone","email"]) {
      if (!hasOwn(body, f)) continue;
      sets.push(`${f} = $${i++}`);
      values.push(parseOptionalString(body[f]));
    }

    for (const f of ["sanity","current_sanity","initiative_score","initiative_bonus","initiative_current"]) {
      if (!hasOwn(body, f)) continue;
      sets.push(`${f} = $${i++}`);
      values.push(parseOptionalInt(body[f], f));
    }

    if (!sets.length) {
      return Response.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const { rows } = await query(
      `UPDATE players
          SET ${sets.join(", ")},
              updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2
          AND deleted_at IS NULL
        RETURNING *`,
      values
    );

    return Response.json(
      rows[0] ? sanitizeRow(rows[0], PLAYER_SANITIZE) : null
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -------- DELETE (SOFT) -------- */
export async function DELETE(req, { params }) {
  const ctx = await getTenantContext(req);
  const id = params?.id;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { rows } = await query(
    `UPDATE players
        SET deleted_at = NOW(),
            updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      RETURNING *`,
    [ctx.tenantId, id]
  );

  return Response.json(
    rows[0] ? sanitizeRow(rows[0], PLAYER_SANITIZE) : null
  );
}
