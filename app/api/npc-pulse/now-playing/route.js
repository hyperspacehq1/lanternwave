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
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { rows } = await query(
    `
    select object_key
    from npc_pulse_playing
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
    pulse: {
      key: rows[0].object_key,
    },
  });
}

/* =========================
   POST — trigger pulse
========================= */
export async function POST(req) {
  const ctx = await getTenantContext(req);
  if (!ctx?.tenantId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const { key, durationMs } = body || {};

  if (!key || !durationMs) {
    return NextResponse.json(
      { ok: false, error: "missing key or durationMs" },
      { status: 400 }
    );
  }

  const expiresAt = new Date(Date.now() + Number(durationMs));

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

  return NextResponse.json({ ok: true });
}
