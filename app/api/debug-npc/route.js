import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DEBUG ROUTE — DO NOT SHIP
 * Purpose: Inspect NPC → clip resolution end-to-end
 */
export async function GET(req) {
  const debug = {
    step: "start",
    url: req.url,
    params: {},
    tenant: null,
    npc: null,
    npc_clips: [],
    resolved_clip: null,
    errors: [],
  };

  try {
    /* -------------------------
       1. Parse params
    -------------------------- */
    const { searchParams } = new URL(req.url);
    const npcId = searchParams.get("npc_id");

    debug.params = {
      npc_id: npcId,
      all_params: Object.fromEntries(searchParams.entries()),
    };

    if (!npcId) {
      debug.errors.push("npc_id missing in query string");
      return NextResponse.json(debug, { status: 400 });
    }

    /* -------------------------
       2. Tenant context
    -------------------------- */
    const ctx = await getTenantContext(req);
    debug.tenant = ctx || null;

    if (!ctx?.tenantId) {
      debug.errors.push("tenantId missing from getTenantContext");
      return NextResponse.json(debug, { status: 401 });
    }

    /* -------------------------
       3. Verify NPC exists
    -------------------------- */
    const npcRes = await query(
      `
      select id, tenant_id, campaign_id, name
      from npcs
      where id = $1
      `,
      [npcId]
    );

    debug.npc = npcRes.rows[0] || null;

    if (!debug.npc) {
      debug.errors.push("NPC not found in npcs table");
      return NextResponse.json(debug);
    }

    if (debug.npc.tenant_id !== ctx.tenantId) {
      debug.errors.push("NPC tenant_id does not match request tenant");
    }

    /* -------------------------
       4. Inspect npc_clips rows
    -------------------------- */
    const npcClipsRes = await query(
      `
      select
        nc.npc_id,
        nc.clip_id,
        nc.created_at,
        nc.deleted_at
      from npc_clips nc
      where nc.npc_id = $1
      order by nc.created_at desc
      `,
      [npcId]
    );

    debug.npc_clips = npcClipsRes.rows;

    if (!npcClipsRes.rows.length) {
      debug.errors.push("No rows found in npc_clips for this npc_id");
    }

    /* -------------------------
       5. Attempt full resolution
    -------------------------- */
    const resolveRes = await query(
      `
      select
        c.id as clip_id,
        c.object_key,
        c.deleted_at,
        nc.created_at
      from npc_clips nc
      join clips c on c.id = nc.clip_id
      join npcs n on n.id = nc.npc_id
      where nc.npc_id = $1
        and n.tenant_id = $2
        and nc.deleted_at is null
        and c.deleted_at is null
      order by nc.created_at desc
      limit 1
      `,
      [npcId, ctx.tenantId]
    );

    debug.resolved_clip = resolveRes.rows[0] || null;

    if (!debug.resolved_clip) {
      debug.errors.push("Clip resolution query returned no rows");
    }

    debug.step = "complete";
    return NextResponse.json(debug);
  } catch (err) {
    debug.step = "exception";
    debug.errors.push(err?.message || String(err));
    return NextResponse.json(debug, { status: 500 });
  }
}
