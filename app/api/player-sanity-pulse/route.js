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

  console.log("[PLAYER PULSE][GET] incoming", {
    time: new Date().toISOString(),
    tenantId: ctx?.tenantId ?? null,
  });

  if (!ctx?.tenantId) {
    console.warn("[PLAYER PULSE][GET] unauthorized");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { rows } = await query(
    `
    select payload, expires_at, created_at
    from player_sanity_pulse_playing
    where tenant_id = $1
    order by expires_at desc
    limit 1
    `,
    [ctx.tenantId]
  );

  console.log("[PLAYER PULSE][GET] db rows", rows);

  if (!rows.length) {
    console.log("[PLAYER PULSE][GET] no active pulse");
    return NextResponse.json({ ok: true, pulse: null });
  }

  const pulse = rows[0];
  const now = new Date();

  console.log("[PLAYER PULSE][GET] timing check", {
    now: now.toISOString(),
    expires_at: pulse.expires_at,
    expired: new Date(pulse.expires_at) <= now,
  });

  if (new Date(pulse.expires_at) <= now) {
    console.log("[PLAYER PULSE][GET] pulse expired");
    return NextResponse.json({ ok: true, pulse: null });
  }

  console.log("[PLAYER PULSE][GET] pulse ACTIVE", pulse.payload);

  return NextResponse.json({
    ok: true,
    pulse: pulse.payload,
  });
}

/* =========================
   POST — GM triggers this
========================= */
export async function POST(req) {
  const ctx = await getTenantContext(req);

  console.log("[PLAYER PULSE][POST] incoming", {
    time: new Date().toISOString(),
    tenantId: ctx?.tenantId ?? null,
  });

  if (!ctx?.tenantId) {
    console.warn("[PLAYER PULSE][POST] unauthorized");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const { players, durationMs } = body || {};

  console.log("[PLAYER PULSE][POST] payload", {
    players,
    durationMs,
  });

  if (!Array.isArray(players) || !players.length || !durationMs) {
    console.warn("[PLAYER PULSE][POST] invalid payload", body);
    return NextResponse.json(
      { ok: false, error: "missing players or durationMs" },
      { status: 400 }
    );
  }

  const expiresAt = new Date(Date.now() + Number(durationMs));

  console.log("[PLAYER PULSE][POST] computed expiration", {
    expiresAt: expiresAt.toISOString(),
  });

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

  console.log("[PLAYER PULSE][POST] pulse written", {
    tenantId: ctx.tenantId,
    playersCount: players.length,
  });

  return NextResponse.json({ ok: true });
}
