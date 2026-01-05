// ==============================
// /api/npcs/[id]/route.js  (FULL, FIXED)
// ==============================

import { sanitizeRow } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_NPC_TYPES = new Set(["ally", "enemy", "neutral"]);

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

/* -----------------------------------------------------------
   GET /api/npcs/[id]
------------------------------------------------------------ */
export async function GET(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params?.id;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { rows } = await query(
    `
    SELECT *
      FROM npcs
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
          goals: 10000,
          secrets: 10000,
          notes: 500,
          factionAlignment: 120,
        })
      : null
  );
}

/* -----------------------------------------------------------
   PUT /api/npcs/[id]
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  const { tenantId } = await getTenantContext(req);
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
      goals: 10000,
      secrets: 10000,
      notes: 500,
      factionAlignment: 120,
    };

    for (const key in fields) {
      if (hasOwn(body, key)) {
        if (body[key] !== null) validateString(body[key], fields[key], key);
        const col =
          key === "factionAlignment"
            ? "faction_alignment"
            : key;
        sets.push(`${col} = $${i++}`);
        values.push(body[key] ?? null);
      }
    }

    if (hasOwn(body, "npcType")) {
      const t = body.npcType;
      if (t && !ALLOWED_NPC_TYPES.has(String(t).toLowerCase())) {
        return Response.json({ error: "Invalid npcType" }, { status: 400 });
      }
      sets.push(`npc_type = $${i++}`);
      values.push(t ? String(t).toLowerCase() : null);
    }

    if (!sets.length) {
      return Response.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    const { rows } = await query(
      `
      UPDATE npcs
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
            goals: 10000,
            secrets: 10000,
            notes: 500,
            factionAlignment: 120,
          })
        : null
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/npcs/[id]   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params?.id;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { rows } = await query(
    `
    UPDATE npcs
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
          goals: 10000,
          secrets: 10000,
          notes: 500,
          factionAlignment: 120,
        })
      : null
  );
}

