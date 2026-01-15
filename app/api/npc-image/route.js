import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET — fetch existing NPC image (by npc_id)
============================================================ */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const npcId = searchParams.get("npc_id");

  if (!npcId) {
    return NextResponse.json(
      { ok: false, error: "missing npc_id" },
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
    SELECT clip_id
    FROM npc_clips
    WHERE npc_id = $1
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [npcId]
  );

  return NextResponse.json({
    ok: true,
    clip_id: rows[0]?.clip_id ?? null,
  });
}

/* ============================================================
   POST — attach image to NPC
============================================================ */
export async function POST(req) {
  const body = await req.json();
  const { npc_id, clip_id } = body || {};

  if (!npc_id || !clip_id) {
    return NextResponse.json(
      { ok: false, error: "missing npc_id or clip_id" },
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

  await query(
    `
    INSERT INTO npc_clips (npc_id, clip_id)
    VALUES ($1, $2)
    `,
    [npc_id, clip_id]
  );

  return NextResponse.json({ ok: true });
}
