import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   GET — viewer polls this
========================= */
export async function GET(req) {
  const ctx = await getTenantContext(req);
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { rows } = await query(
    `
    select payload
    from player_sanity_pulse_playing
    where tenant_id = $1
      and expires_at > now()
    limit 1
    `,
    [ctx.tenantId]
  );

  if (!rows.length) {
    return NextResponse.json({ ok: true, pulse: null });
  }

  return NextResponse.json({
    ok: true,
    pulse: rows[0].payload,
  });
}

/* =========================
   POST — GM triggers this
========================= */
export async function POST(req) {
  const ctx = await getTenantContext(req);
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const { players, durationMs } = body || {};

  if (!Array.isArray(players) || !players.length || !durationMs) {
    return NextResponse.json(
      { ok: false, error: "missing players or durationMs" },
      { status: 400 }
    );
  }

  const expiresAt = new Date(Date.now() + Number(durationMs));

  await query(
    `
    insert into player_sanity_pulse_playing (tenant_id, payload, expires_at)
    values ($1, $2, $3)
    on conflict (tenant_id)
    do update set
      payload = excluded.payload,
      expires_at = excluded.expires_at,
      created_at = now()
    `,
    [ctx.tenantId, { title: "Sanity", players }, expiresAt]
  );

  return NextResponse.json({ ok: true });
}
