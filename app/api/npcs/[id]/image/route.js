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

    // 🔧 FIX: allow cmApi header fallback
    const tenantId =
      ctx?.tenantId || req.headers.get("x-tenant-id");

    const npcId = params?.id;

    const body = await req.json().catch(() => null);
    const clipId = body?.clip_id;

    if (!npcId) {
      return Response.json(
        { error: "Missing NPC id" },
        { status: 400 }
      );
    }

    if (!tenantId) {
      return Response.json(
        { error: "Missing tenant context" },
        { status: 400 }
      );
    }

    if (!clipId) {
      return Response.json(
        { error: "clip_id required" },
        { status: 400 }
      );
    }

    // Validate NPC ownership
    const npcCheck = await query(
      `
      SELECT id
      FROM npcs
      WHERE id = $1
        AND tenant_id = $2
        AND deleted_at IS NULL
      `,
      [npcId, tenantId]
    );

    if (!npcCheck.rowCount) {
      return Response.json(
        { error: "NPC not found for tenant" },
        { status: 404 }
      );
    }

    // Validate clip ownership
    const clipCheck = await query(
      `
      SELECT id
      FROM clips
      WHERE id = $1
        AND tenant_id = $2
        AND deleted_at IS NULL
      `,
      [clipId, tenantId]
    );

    if (!clipCheck.rowCount) {
      return Response.json(
        { error: "Clip not found for tenant" },
        { status: 404 }
      );
    }

    // Remove existing links
    await query(
      `
      DELETE FROM npc_clips
      WHERE npc_id = $1
      `,
      [npcId]
    );

    // Attach new image
    await query(
      `
      INSERT INTO npc_clips (npc_id, clip_id)
      VALUES ($1, $2)
      `,
      [npcId, clipId]
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

    // 🔧 FIX: allow cmApi header fallback
    const tenantId =
      ctx?.tenantId || req.headers.get("x-tenant-id");

    const npcId = params?.id;

    if (!npcId || !tenantId) {
      return Response.json(
        { error: "Invalid tenant or NPC" },
        { status: 400 }
      );
    }

    const npcCheck = await query(
      `
      SELECT id
      FROM npcs
      WHERE id = $1
        AND tenant_id = $2
        AND deleted_at IS NULL
      `,
      [npcId, tenantId]
    );

    if (!npcCheck.rowCount) {
      return Response.json(
        { error: "NPC not found for tenant" },
        { status: 404 }
      );
    }

    await query(
      `
      DELETE FROM npc_clips
      WHERE npc_id = $1
      `,
      [npcId]
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
