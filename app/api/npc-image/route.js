import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const trace = crypto.randomUUID();

  try {
    const ctx = await getTenantContext(req);
    const tenantId = ctx?.tenantId;

    const body = await req.json().catch(() => null);
    const npcId = body?.npc_id;
    const clipId = body?.clip_id;

    // 🔎 HIGH-SIGNAL DIAGNOSTIC BLOCK
    if (!tenantId || !npcId || !clipId) {
      return Response.json(
        {
          error: "Invalid NPC image attach request",
          trace,
          missing: {
            tenantId: !tenantId,
            npcId: !npcId,
            clipId: !clipId,
          },
          received: {
            tenantId: tenantId ?? null,
            npcId: npcId ?? null,
            clipId: clipId ?? null,
          },
          context: {
            hasCookies: !!req.headers.get("cookie"),
            contentType: req.headers.get("content-type"),
          },
        },
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

    return Response.json({ ok: true, trace });

  } catch (err) {
    console.error("[NPC IMAGE ATTACH]", trace, err);
    return Response.json(
      {
        error: "Failed to attach image",
        trace,
      },
      { status: 500 }
    );
  }
}
