import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const trace = crypto.randomUUID();

  console.log("──────── NPC IMAGE POST ────────");
  console.log("[trace]", trace);
  console.log("[method]", req.method);
  console.log("[url]", req.url);
  console.log("[params raw]", params);

  try {
    const ctx = await getTenantContext(req);

    console.log("[tenant ctx raw]", ctx);
    console.log("[tenantId]", ctx?.tenantId);
    console.log("[npcId from params]", params?.id);

    const tenantId = ctx?.tenantId;
    const npcId = params?.id;

    if (!tenantId || !npcId) {
      console.error("[NPC IMAGE POST] missing identifiers", {
        trace,
        tenantId,
        npcId,
        params,
        ctx,
      });

      return Response.json(
        {
          error: "Missing tenant or NPC id",
          trace,
          debug: {
            tenantId: tenantId ?? null,
            npcId: npcId ?? null,
            params,
            hasCookies: req.headers.get("cookie") ? true : false,
          },
        },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[NPC IMAGE POST] invalid json", trace, e);
      return Response.json(
        {
          error: "Invalid JSON body",
          trace,
        },
        { status: 400 }
      );
    }

    console.log("[NPC IMAGE POST] body", trace, body);

    const clipId = body?.clip_id;
    if (!clipId) {
      return Response.json(
        {
          error: "clip_id required",
          trace,
        },
        { status: 400 }
      );
    }

    console.log("[NPC IMAGE POST] attaching", {
      trace,
      npcId,
      clipId,
    });

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
    console.error("[NPC IMAGE POST] fatal", trace, err);
    return Response.json(
      {
        error: "Failed to attach image",
        trace,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  const trace = crypto.randomUUID();
  console.log("──────── NPC IMAGE DELETE ────────", trace);

  try {
    const ctx = await getTenantContext(req);
    const tenantId = ctx?.tenantId;
    const npcId = params?.id;

    console.log("[DELETE] tenantId", tenantId);
    console.log("[DELETE] npcId", npcId);

    if (!tenantId || !npcId) {
      return Response.json(
        {
          error: "Missing tenant or NPC id",
          trace,
          debug: {
            tenantId: tenantId ?? null,
            npcId: npcId ?? null,
            params,
          },
        },
        { status: 400 }
      );
    }

    await query(
      `DELETE FROM npc_clips WHERE npc_id = $1`,
      [npcId]
    );

    console.log("[NPC IMAGE DELETE] success", trace);

    return Response.json({ ok: true, trace });
  } catch (err) {
    console.error("[NPC IMAGE DELETE] fatal", trace, err);
    return Response.json(
      {
        error: "Failed to detach image",
        trace,
      },
      { status: 500 }
    );
  }
}
