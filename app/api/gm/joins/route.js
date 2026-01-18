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
    /* ---------------- Sessions → Encounters ---------------- */
    if (entity === "sessions") {
      const { rows } = await query(
        `
        SELECT encounter_id
          FROM session_encounters
         WHERE tenant_id = $1
           AND session_id = $2
        `,
        [tenantId, id]
      );

      result.joined.encounters = rows.map(r => r.encounter_id);
    }

    /* ---------------- Encounters → NPCs ---------------- */
    else if (entity === "encounters") {
      const { rows } = await query(
        `
        SELECT npc_id
          FROM encounter_npcs
         WHERE tenant_id = $1
           AND encounter_id = $2
        `,
        [tenantId, id]
      );

      result.joined.npcs = rows.map(r => r.npc_id);
    }

    /* ---------------- Locations → Items ---------------- */
    else if (entity === "locations") {
      const { rows } = await query(
        `
        SELECT item_id
          FROM location_items
         WHERE tenant_id = $1
           AND location_id = $2
        `,
        [tenantId, id]
      );

      result.joined.items = rows.map(r => r.item_id);
    }

    else {
      return Response.json(
        { error: "Invalid entity type" },
        { status: 400 }
      );
    }

    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
