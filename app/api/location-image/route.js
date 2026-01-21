import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET — fetch existing Location image (by location_id)
============================================================ */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("location_id");

  if (!locationId) {
    return NextResponse.json(
      { ok: false, error: "missing location_id" },
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
    FROM location_clips
    WHERE location_id = $1
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [locationId]
  );

  return NextResponse.json({
    ok: true,
    clip_id: rows[0]?.clip_id ?? null,
  });
}

/* ============================================================
   POST — attach image to Location
============================================================ */
export async function POST(req) {
  const body = await req.json();
  const { location_id, clip_id } = body || {};

  if (!location_id || !clip_id) {
    return NextResponse.json(
      { ok: false, error: "missing location_id or clip_id" },
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
    INSERT INTO location_clips (location_id, clip_id)
    VALUES ($1, $2)
    `,
    [location_id, clip_id]
  );

  return NextResponse.json({ ok: true });
}
