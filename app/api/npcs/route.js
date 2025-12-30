import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_NPC_TYPES = new Set([
  "ally",
  "enemy",
  "neutral",
  "merchant",
  "authority",
  "mystic",
]);

function pick(body, camel, snake) {
  return body[camel] ?? body[snake];
}

/* -----------------------------------------------------------
   GET /api/npcs
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  if (id) {
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
            npcType: 50,
            description: 10000,
            goals: 10000,
            factionAlignment: 100,
            secrets: 10000,
            notes: 10000,
          })
        : null
    );
  }

  if (campaignId) {
    const { rows } = await query(
      `
      SELECT *
        FROM npcs
       WHERE tenant_id = $1
         AND campaign_id = $2
         AND deleted_at IS NULL
       ORDER BY name ASC
      `,
      [tenantId, campaignId]
    );

    return Response.json(
      sanitizeRows(rows, {
        name: 120,
        npcType: 50,
        description: 10000,
        goals: 10000,
        factionAlignment: 100,
        secrets: 10000,
        notes: 10000,
      })
    );
  }

  const { rows } = await query(
    `
    SELECT *
      FROM npcs
     WHERE tenant_id = $1
       AND deleted_at IS NULL
     ORDER BY name ASC
    `,
    [tenantId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      npcType: 50,
      description: 10000,
      goals: 10000,
      factionAlignment: 100,
      secrets: 10000,
      notes: 10000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/npcs
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId ?? null;
  const name = pick(body, "name", "name");
  const npcType = pick(body, "npcType", "npc_type");

  if (!campaignId) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  if (!name || !name.trim()) {
    return Response.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  if (npcType !== undefined && !ALLOWED_NPC_TYPES.has(npcType)) {
    return Response.json(
      { error: "Invalid npc type" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    INSERT INTO npcs (
      tenant_id,
      campaign_id,
      name,
      npc_type,
      description,
      goals,
      faction_alignment,
      secrets,
      notes
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      tenantId,
      campaignId,
      name.trim(),
      npcType ?? null,
      pick(body, "description", "description") ?? null,
      pick(body, "goals", "goals") ?? null,
      pick(body, "factionAlignment", "faction_alignment") ?? null,
      pick(body, "secrets", "secrets") ?? null,
      pick(body, "notes", "notes") ?? null,
    ]
  );

  return Response.json(
    sanitizeRow(rows[0], {
      name: 120,
      npcType: 50,
      description: 10000,
      goals: 10000,
      factionAlignment: 100,
      secrets: 10000,
      notes: 10000,
    }),
    { status: 201 }
  );
}

/* -----------------------------------------------------------
   PUT /api/npcs?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  if ("name" in body && (!body.name || !body.name.trim())) {
    return Response.json(
      { error: "name cannot be blank" },
      { status: 400 }
    );
  }

  if (
    "npcType" in body &&
    body.npcType !== undefined &&
    !ALLOWED_NPC_TYPES.has(body.npcType)
  ) {
    return Response.json(
      { error: "Invalid npc type" },
      { status: 400 }
    );
  }

  const sets = [];
  const values = [tenantId, id];
  let i = 3;

  if (body.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(body.name.trim());
  }

  if (body.npcType !== undefined) {
    sets.push(`npc_type = $${i++}`);
    values.push(body.npcType);
  }

  if (body.description !== undefined) {
    sets.push(`description = $${i++}`);
    values.push(body.description);
  }

  if (body.goals !== undefined) {
    sets.push(`goals = $${i++}`);
    values.push(body.goals);
  }

  if (body.factionAlignment !== undefined) {
    sets.push(`faction_alignment = $${i++}`);
    values.push(body.factionAlignment);
  }

  if (body.secrets !== undefined) {
    sets.push(`secrets = $${i++}`);
    values.push(body.secrets);
  }

  if (body.notes !== undefined) {
    sets.push(`notes = $${i++}`);
    values.push(body.notes);
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
          npcType: 50,
          description: 10000,
          goals: 10000,
          factionAlignment: 100,
          secrets: 10000,
          notes: 10000,
        })
      : null
  );
}

/* -----------------------------------------------------------
   DELETE /api/npcs?id=   (SOFT DELETE)
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
          npcType: 50,
          description: 10000,
          goals: 10000,
          factionAlignment: 100,
          secrets: 10000,
          notes: 10000,
        })
      : null
  );
}
