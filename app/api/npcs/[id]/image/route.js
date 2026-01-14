// ==============================
// /api/npcs/[id]/image/route.js
// ==============================

import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   POST → attach image (existing NPCs only)
------------------------------------------------------------ */
export async function POST(req, { params }) {
  try {
    const ctx = await getTenantContext(req);
    const tenantId = ctx?.tenantId;
    const npcId = params?.id;

    if (!tenantId || !npcId) {
      return Response.json(
        { error: "NPC must be saved before attaching an image" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const clip_id = body?.clip_id;

    if (!clip_id) {
      return Response.json(
        { error: "clip_id required" },
        { status: 400 }
      );
    }

    // Ensure NPC exists and belongs to tenant
    const npcCheck = await query(
      `
      SELECT id
      FROM npcs
      WHERE id = $1 AND tenant_id = $2
      `,
      [npcId, tenantId]
    );

    if (!npcCheck.rowCount) {
      return Response.json(
        { error: "NPC not found for tenant" },
        { status: 404 }
      );
    }

    // Remove any existing image
    await query(
      `
      DELETE FROM npc_clips
      WHERE tenant_id = $1
        AND npc_id = $2
      `,
      [tenantId, npcId]
    );

    // Attach new image
    await query(
      `
      INSERT INTO npc_clips (tenant_id, npc_id, clip_id)
      VALUES ($1, $2, $3)
      `,
      [tenantId, npcId, clip_id]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[npc image POST]", err);
    return Response.json(
      { error: "Failed to attach image" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   DELETE → detach image
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  try {
    const ctx = await getTenantContext(req);
    const tenantId = ctx?.tenantId;
    const npcId = params?.id;

    if (!tenantId || !npcId) {
      return Response.json(
        { error: "Invalid tenant or NPC" },
        { status: 400 }
      );
    }

    await query(
      `
      DELETE FROM npc_clips
      WHERE tenant_id = $1
        AND npc_id = $2
      `,
      [tenantId, npcId]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[npc image DELETE]", err);
    return Response.json(
      { error: "Failed to detach image" },
      { status: 500 }
    );
  }
}
