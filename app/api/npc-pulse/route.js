import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * NPC RESOLVER ROUTE
 * ------------------
 * GET /api/npc-pulse?npc_id=...
 * Returns: { ok: true, key }
 */
export async function GET(req) {
  console.log("🟢 [npc-pulse] HIT resolver route");

  try {
    const url = new URL(req.url);
    console.log("🟢 [npc-pulse] URL:", url.toString());

    const npcId = url.searchParams.get("npc_id");
    console.log("🟢 [npc-pulse] npc_id:", npcId);

    if (!npcId) {
      console.warn("🔴 [npc-pulse] Missing npc_id");
      return NextResponse.json(
        { ok: false, error: "npc_id required" },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(req);
    console.log("🟢 [npc-pulse] tenant context:", ctx);

    if (!ctx?.tenantId) {
      console.warn("🔴 [npc-pulse] Unauthorized (no tenant)");
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    console.log("🟢 [npc-pulse] Resolving clip for NPC", {
      npcId,
      tenantId: ctx.tenantId,
    });

    const { rows } = await query(
      `
      SELECT c.object_key
      FROM npc_clips nc
      JOIN npcs n ON n.id = nc.npc_id
      JOIN clips c ON c.id = nc.clip_id
      WHERE nc.npc_id = $1
        AND n.tenant_id = $2
        AND nc.deleted_at IS NULL
        AND c.deleted_at IS NULL
      ORDER BY nc.created_at DESC
      LIMIT 1
      `,
      [npcId, ctx.tenantId]
    );

    console.log("🟢 [npc-pulse] Query result rows:", rows);

    if (!rows.length) {
      console.warn("🟡 [npc-pulse] No clip found for NPC", npcId);
      return NextResponse.json(
        { ok: false, error: "no clip found for npc" },
        { status: 404 }
      );
    }

    console.log("✅ [npc-pulse] Resolved object_key:", rows[0].object_key);

    return NextResponse.json({
      ok: true,
      key: rows[0].object_key,
    });
  } catch (err) {
    console.error("🔥 [npc-pulse] UNHANDLED ERROR", err);

    return NextResponse.json(
      { ok: false, error: "internal error" },
      { status: 500 }
    );
  }
}
