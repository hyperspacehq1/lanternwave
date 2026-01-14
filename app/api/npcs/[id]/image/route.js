import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const trace = crypto.randomUUID();
  console.log("[NPC IMAGE POST] start", trace);

  try {
    const ctx = await getTenantContext(req);
    console.log("[NPC IMAGE POST] ctx", trace, ctx);

    const tenantId = ctx?.tenantId;
    const npcId = params?.id;

    if (!tenantId || !npcId) {
      console.error("[NPC IMAGE POST] missing ids", {
        trace,
        tenantId,
        npcId,
      });

      return Response.json(
        { error: "Missing tenant or NPC id", trace },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[NPC IMAGE POST] invalid json", trace, e);
      return Response.json(
        { error: "Invalid JSON body", trace },
        { status: 400 }
      );
    }

    console.log("[NPC IMAGE POST] body", trace, body);

    const clipId = body?.clip_id;
    if (!clipId) {
      return Response.json(
        { error: "clip_id required", trace },
        { status: 400 }
      );
    }

    await query(
      `DELETE FROM npc_clips WHERE npc_id = $1`,
      [npcId]
    );

    await query(
      `INSERT INTO npc_clips (npc_id, clip_id)
       VALUES ($1, $2)`,
      [npcId, clipId]
    );

    console.log("[NPC IMAGE POST] success", trace);

    return Response.json({ ok: true, trace });
  } catch (err) {
    console.error("[NPC IMAGE POST] fatal", err);
    return Response.json(
      { error: "Failed to attach image", trace },
      { status: 500 }
    );
  }
}

    await query(
      `DELETE FROM npc_clips WHERE npc_id = $1`,
      [npcId]
    );

    await query(
      `INSERT INTO npc_clips (npc_id, clip_id)
       VALUES ($1, $2)`,
      [npcId, clipId]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[NPC IMAGE POST]", err);
    return Response.json(
      { error: "Failed to attach image" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const ctx = await getTenantContext(req);
    const tenantId = ctx?.tenantId;
    const npcId = params?.id;

    if (!tenantId || !npcId) {
      return Response.json(
        { error: "Missing tenant or NPC id" },
        { status: 400 }
      );
    }

    await query(
      `DELETE FROM npc_clips WHERE npc_id = $1`,
      [npcId]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[NPC IMAGE DELETE]", err);
    return Response.json(
      { error: "Failed to detach image" },
      { status: 500 }
    );
  }
}
