import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/npcs
   ?id=
   ?campaign_id=
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

  if (!body.campaign_id) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  if (!body.name || !body.name.trim()) {
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
      body.campaign_id,
      body.name.trim(),
      body.npc_type ?? null,
      body.description ?? null,
      body.goals ?? null,
      body.faction_alignment ?? null,
      body.secrets ?? null,
      body.notes ?? null,
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
       SET name               = COALESCE($3, name),
           npc_type           = COALESCE($4, npc_type),
           description        = COALESCE($5, description),
           goals              = COALESCE($6, goals),
           faction_alignment  = COALESCE($7, faction_alignment),
           secrets            = COALESCE($8, secrets),
           notes              = COALESCE($9, notes),
           updated_at         = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      body.name,
      body.npc_type,
      body.description,
      body.goals,
      body.faction_alignment,
      body.secrets,
      body.notes,
    ]
  );

  return Response.json(result.rows[0] || null);
}
