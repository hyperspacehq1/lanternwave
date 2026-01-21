// ==============================
// /api/npcs/route.js  (FULL, FIXED - Pattern A, Defensive)
// ==============================

import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
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
   GET /api/npcs
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

  // ✅ DEFENSIVE: accept both
  const campaignId =
    searchParams.get("campaign_id") ??
    searchParams.get("campaignId");

  if (!campaignId) return Response.json([]);

  const { rows } = await query(
    `
    SELECT *
      FROM npcs
     WHERE tenant_id = $1
       AND campaign_id = $2
       AND deleted_at IS NULL
     ORDER BY created_at ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      description: 10000,
      goals: 10000,
      secrets: 10000,
      notes: 500,
      factionAlignment: 120,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/npcs
------------------------------------------------------------ */
export async function POST(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId ?? null;
  if (!campaignId) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

  try {
    if (!body.name) throw new Error("name is required");
    validateString(body.name, 120, "name");

    const npcType = body.npcType ?? body.npc_type ?? null;
    if (npcType && !ALLOWED_NPC_TYPES.has(String(npcType).toLowerCase())) {
      return Response.json({ error: "Invalid npcType" }, { status: 400 });
    }

    if (hasOwn(body, "description") && body.description !== null)
      validateString(body.description, 10000, "description");

    if (hasOwn(body, "goals") && body.goals !== null)
      validateString(body.goals, 10000, "goals");

    if (hasOwn(body, "secrets") && body.secrets !== null)
      validateString(body.secrets, 10000, "secrets");

    if (hasOwn(body, "notes") && body.notes !== null)
      validateString(body.notes, 500, "notes");

    if (hasOwn(body, "factionAlignment") && body.factionAlignment !== null)
      validateString(body.factionAlignment, 120, "factionAlignment");

    const { rows } = await query(
      `
      INSERT INTO npcs (
        tenant_id,
        campaign_id,
        name,
        npc_type,
        description,
        goals,
        secrets,
        notes,
        faction_alignment
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        tenantId,
        campaignId,
        body.name.trim(),
        npcType ? String(npcType).toLowerCase() : null,
        body.description ?? null,
        body.goals ?? null,
        body.secrets ?? null,
        body.notes ?? null,
        body.factionAlignment ?? null,
      ]
    );

    return Response.json(
      sanitizeRow(rows[0], {
        name: 120,
        description: 10000,
        goals: 10000,
        secrets: 10000,
        notes: 500,
        factionAlignment: 120,
      }),
      { status: 201 }
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* -----------------------------------------------------------
   PUT /api/npcs?id=
------------------------------------------------------------ */
export async function PUT(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
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
        const col = key === "factionAlignment" ? "faction_alignment" : key;
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
      return Response.json({ error: "No valid fields provided" }, { status: 400 });
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
   DELETE /api/npcs?id=   (SOFT DELETE)
------------------------------------------------------------ */
export async function DELETE(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

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
