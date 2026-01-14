import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  try {
    const ctx = await getTenantContext(req);
    const tenantId = ctx?.tenantId;
    const npcId = params?.id;

    if (!tenantId) {
      return Response.json(
        { error: "Missing tenant context" },
        { status: 400 }
      );
    }

    if (!npcId) {
      return Response.json(
        { error: "Missing NPC id" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const clipId = body?.clip_id;

    if (!clipId) {
      return Response.json(
        { error: "clip_id required" },
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
