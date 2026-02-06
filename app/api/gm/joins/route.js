import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/gm/joins
   ?entity=sessions|encounters|locations
   &id=<record_id>
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

  const entity = searchParams.get("entity");
  const id = searchParams.get("id");

  if (!entity || !id) {
    return Response.json(
      { error: "entity and id are required" },
      { status: 400 }
    );
  }

  const result = {
    entity,
    id,
    joined: {},
  };

  try {
    if (entity === "sessions") {
      const { rows } = await query(
        `
        SELECT encounter_id::text AS encounter_id
          FROM session_encounters
         WHERE tenant_id = $1
           AND session_id = $2
           AND deleted_at IS NULL
        `,
        [tenantId, id]
      );

      result.joined.encounters = rows.map((r) => r.encounter_id);
    }

    else if (entity === "encounters") {
      const { rows } = await query(
        `
        SELECT npc_id::text AS npc_id
          FROM encounter_npcs
         WHERE tenant_id = $1
           AND encounter_id = $2
           AND deleted_at IS NULL
        `,
        [tenantId, id]
      );

      result.joined.npcs = rows.map((r) => r.npc_id);
    }

    else if (entity === "locations") {
      const { rows: itemRows } = await query(
        `
        SELECT item_id::text AS item_id
          FROM location_items
         WHERE tenant_id = $1
           AND location_id = $2
           AND deleted_at IS NULL
        `,
        [tenantId, id]
      );

      result.joined.items = itemRows.map((r) => r.item_id);

      const { rows: npcRows } = await query(
        `
        SELECT npc_id::text AS npc_id
          FROM location_npcs
         WHERE tenant_id = $1
           AND location_id = $2
           AND deleted_at IS NULL
        `,
        [tenantId, id]
      );

      result.joined.npcs = npcRows.map((r) => r.npc_id);
    }

    else {
      return Response.json({ error: "Invalid entity type" }, { status: 400 });
    }

    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
