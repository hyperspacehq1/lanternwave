import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   GET — read active pulse
========================= */
export async function GET(req) {
  const ctx = await getTenantContext(req);

  console.log("[NPC PULSE][GET] incoming request", {
    time: new Date().toISOString(),
    tenantId: ctx?.tenantId ?? null,
  });

  if (!ctx?.tenantId) {
    console.warn("[NPC PULSE][GET] unauthorized");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { rows } = await query(
    `
    select object_key, expires_at, created_at
    from npc_pulse_playing
    where tenant_id = $1
    order by expires_at desc
    limit 1
    `,
    [ctx.tenantId]
  );

  console.log("[NPC PULSE][GET] db rows", rows);

  if (!rows.length) {
    console.log("[NPC PULSE][GET] no pulse found");
    return NextResponse.json({ ok: true, pulse: null });
  }

  const pulse = rows[0];
  const now = new Date();

  console.log("[NPC PULSE][GET] pulse timing", {
    now: now.toISOString(),
    expires_at: pulse.expires_at,
    expired: new Date(pulse.expires_at) <= now,
  });

  if (new Date(pulse.expires_at) <= now) {
    console.log("[NPC PULSE][GET] pulse expired");
    return NextResponse.json({ ok: true, pulse: null });
  }

  console.log("[NPC PULSE][GET] pulse ACTIVE", {
    key: pulse.object_key,
  });

  return NextResponse.json({
    ok: true,
    pulse: {
      key: pulse.object_key,
    },
  });
}

/* =========================
   POST — trigger pulse
========================= */
export async function POST(req) {
  const ctx = await getTenantContext(req);

  console.log("[NPC PULSE][POST] incoming request", {
    time: new Date().toISOString(),
    tenantId: ctx?.tenantId ?? null,
  });

  if (!ctx?.tenantId) {
    console.warn("[NPC PULSE][POST] unauthorized");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const { key, durationMs } = body || {};

  console.log("[NPC PULSE][POST] payload", {
    key,
    durationMs,
  });

  if (!key || !durationMs) {
    console.warn("[NPC PULSE][POST] missing data", body);
    return NextResponse.json(
      { ok: false, error: "missing key or durationMs" },
      { status: 400 }
    );
  }

  const expiresAt = new Date(Date.now() + Number(durationMs));

  console.log("[NPC PULSE][POST] computed expiration", {
    expiresAt: expiresAt.toISOString(),
  });

  await query(
    `
    insert into npc_pulse_playing (tenant_id, object_key, expires_at)
    values ($1, $2, $3)
    on conflict (tenant_id)
    do update set
      object_key = excluded.object_key,
      expires_at = excluded.expires_at,
      created_at = now()
    `,
    [ctx.tenantId, key, expiresAt]
  );

  console.log("[NPC PULSE][POST] pulse written to DB", {
    tenantId: ctx.tenantId,
    key,
  });

  return NextResponse.json({ ok: true });
}
