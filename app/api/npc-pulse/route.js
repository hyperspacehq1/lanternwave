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
  try {
    const url = new URL(req.url);
    const npcId = url.searchParams.get("npc_id");

    if (!npcId) {
      return NextResponse.json(
        { ok: false, error: "npc_id required" },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(req);

    if (!ctx?.tenantId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

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

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, error: "no clip found for npc" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      key: rows[0].object_key,
    });
  } catch (err) {
    console.error("[npc-pulse] UNHANDLED ERROR", err);

    return NextResponse.json(
      { ok: false, error: "internal error" },
      { status: 500 }
    );
  }
}