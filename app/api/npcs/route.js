import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   Helpers
------------------------------------------------------------ */
function pick(body, camel, snake) {
  return body[camel] ?? body[snake] ?? null;
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
    const result = await query(
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
    return Response.json(result.rows[0] || null);
  }

  if (campaignId) {
    const result = await query(
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
    return Response.json(result.rows);
  }

  const result = await query(
    `
    SELECT *
      FROM npcs
     WHERE tenant_id = $1
       AND deleted_at IS NULL
     ORDER BY name ASC
    `,
    [tenantId]
  );

  return Response.json(result.rows);
}

/* -----------------------------------------------------------
   POST /api/npcs
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const campaignId =
    body.campaign_id ?? body.campaignId ?? null;

  const name = pick(body, "name", "name");
  const npcType = pick(body, "npcType", "npc_type");
  const description = pick(body, "description", "description");
  const goals = pick(body, "goals", "goals");
  const factionAlignment = pick(body, "factionAlignment", "faction_alignment");
  const secrets = pick(body, "secrets", "secrets");
  const notes = pick(body, "notes", "notes");

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

  const result = await query(
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
      npcType,
      description,
      goals,
      factionAlignment,
      secrets,
      notes,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
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

  const result = await query(
    `
    UPDATE npcs
       SET name              = COALESCE($3, name),
           npc_type          = COALESCE($4, npc_type),
           description       = COALESCE($5, description),
           goals             = COALESCE($6, goals),
           faction_alignment = COALESCE($7, faction_alignment),
           secrets           = COALESCE($8, secrets),
           notes             = COALESCE($9, notes),
           updated_at        = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      pick(body, "name", "name"),
      pick(body, "npcType", "npc_type"),
      pick(body, "description", "description"),
      pick(body, "goals", "goals"),
      pick(body, "factionAlignment", "faction_alignment"),
      pick(body, "secrets", "secrets"),
      pick(body, "notes", "notes"),
    ]
  );

  return Response.json(result.rows[0] || null);
}
