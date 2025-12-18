import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/npcs
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");
  const sessionId = searchParams.get("session_id");

  // Single NPC + events
  if (id) {
    const npcRes = await query(
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

    if (!npcRes.rows.length) {
      return Response.json({ error: "NPC not found" }, { status: 404 });
    }

    const events = await query(
      `
      SELECT e.*
      FROM event_npcs en
      JOIN events e ON e.id = en.event_id
      WHERE en.npc_id = $1
        AND e.tenant_id = $2
        AND e.deleted_at IS NULL
      ORDER BY e.created_at ASC
      `,
      [id, tenantId]
    );

    return Response.json({ ...npcRes.rows[0], events: events.rows });
  }

  // NPCs by campaign
  if (campaignId) {
    const result = await query(
      `
      SELECT DISTINCT n.*
      FROM npcs n
      JOIN event_npcs en ON en.npc_id = n.id
      JOIN events e ON e.id = en.event_id
      WHERE e.campaign_id = $1
        AND n.tenant_id = $2
        AND e.tenant_id = $2
        AND n.deleted_at IS NULL
        AND e.deleted_at IS NULL
      ORDER BY n.first_name ASC, n.last_name ASC
      `,
      [campaignId, tenantId]
    );
    return Response.json(result.rows);
  }

  // NPCs by session
  if (sessionId) {
    const result = await query(
      `
      SELECT DISTINCT n.*
      FROM npcs n
      JOIN event_npcs en ON en.npc_id = n.id
      JOIN events e ON e.id = en.event_id
      WHERE e.session_id = $1
        AND n.tenant_id = $2
        AND e.tenant_id = $2
        AND n.deleted_at IS NULL
        AND e.deleted_at IS NULL
      ORDER BY n.first_name ASC, n.last_name ASC
      `,
      [sessionId, tenantId]
    );
    return Response.json(result.rows);
  }

  // All NPCs
  const result = await query(
    `
    SELECT *
    FROM npcs
    WHERE tenant_id = $1
      AND deleted_at IS NULL
    ORDER BY first_name ASC, last_name ASC
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

  if (!body.first_name) {
    return Response.json(
      { error: "first_name is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO npcs (
      tenant_id,
      first_name,
      last_name,
      npc_type,
      data,
      personality,
      goals,
      faction_alignment,
      secrets,
      state,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
    RETURNING *
    `,
    [
      tenantId,
      body.first_name,
      body.last_name ?? "",
      body.npc_type ?? "neutral",
      body.data ?? "",
      body.personality ?? "",
      body.goals ?? "",
      body.faction_alignment ?? "",
      body.secrets ?? "",
      body.state ?? "alive",
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

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const body = await req.json();

  const result = await query(
    `
    UPDATE npcs
       SET first_name        = COALESCE($3, first_name),
           last_name         = COALESCE($4, last_name),
           npc_type          = COALESCE($5, npc_type),
           data              = COALESCE($6, data),
           personality       = COALESCE($7, personality),
           goals             = COALESCE($8, goals),
           faction_alignment = COALESCE($9, faction_alignment),
           secrets           = COALESCE($10, secrets),
           state             = COALESCE($11, state),
           updated_at        = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      body.first_name,
      body.last_name,
      body.npc_type,
      body.data,
      body.personality,
      body.goals,
      body.faction_alignment,
      body.secrets,
      body.state,
    ]
  );

  if (!result.rows.length) {
    return Response.json({ error: "NPC not found" }, { status: 404 });
  }

  return Response.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api/npcs?id=
   (soft delete)
------------------------------------------------------------ */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const result = await query(
    `
    UPDATE npcs
       SET deleted_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING id
    `,
    [tenantId, id]
  );

  if (!result.rows.length) {
    return Response.json({ error: "NPC not found" }, { status: 404 });
  }

  return Response.json({ success: true, id });
}
