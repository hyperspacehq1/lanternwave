// ==============================
// /api/npcs/[id]/image/route.js
// ==============================

import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   POST → attach image
   body: { clip_id }
------------------------------------------------------------ */
export async function POST(req, { params }) {
  const ctx = await getTenantContext(req);
  const tenantId = ctx.tenantId;
  const npcId = params.id;
  const { clip_id } = await req.json();

  if (!clip_id) {
    return Response.json({ error: "clip_id required" }, { status: 400 });
  }

  await query(
    `
    DELETE FROM npc_clips
     WHERE tenant_id = $1
       AND npc_id = $2
    `,
    [tenantId, npcId]
  );

  await query(
    `
    INSERT INTO npc_clips (tenant_id, npc_id, clip_id)
    VALUES ($1, $2, $3)
    `,
    [tenantId, npcId, clip_id]
  );

  return Response.json({ ok: true });
}

/* -----------------------------------------------------------
   DELETE → detach image
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  const ctx = await getTenantContext(req);
  const tenantId = ctx.tenantId;
  const npcId = params.id;

  await query(
    `
    DELETE FROM npc_clips
     WHERE tenant_id = $1
       AND npc_id = $2
    `,
    [tenantId, npcId]
  );

  return Response.json({ ok: true });
}
