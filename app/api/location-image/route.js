import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET — fetch existing Location image (by location_id)
============================================================ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("location_id");

    console.log("[location-image][GET] location_id:", locationId);

    if (!locationId) {
      console.error("[location-image][GET] missing location_id");
      return NextResponse.json(
        { ok: false, error: "missing location_id" },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(req);
    console.log("[location-image][GET] tenant context:", ctx);

    if (!ctx?.tenantId) {
      console.error("[location-image][GET] unauthorized — no tenant");
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const { rows } = await query(
      `
      SELECT lc.clip_id
      FROM location_clips lc
      JOIN locations l ON l.id = lc.location_id
      WHERE lc.location_id = $1
        AND l.tenant_id = $2
        AND lc.deleted_at IS NULL
      ORDER BY lc.created_at DESC
      LIMIT 1
      `,
      [locationId, ctx.tenantId]
    );

    console.log("[location-image][GET] query result:", rows);

    return NextResponse.json({
      ok: true,
      clip_id: rows[0]?.clip_id ?? null,
    });
  } catch (err) {
    console.error("[location-image][GET] UNCAUGHT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST — attach image to Location
============================================================ */
export async function POST(req) {
  try {
    const body = await req.json();
    const { location_id, clip_id } = body || {};

    console.log("[location-image][POST] body:", body);

    if (!location_id || !clip_id) {
      console.error(
        "[location-image][POST] missing params",
        { location_id, clip_id }
      );
      return NextResponse.json(
        { ok: false, error: "missing location_id or clip_id" },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(req);
    console.log("[location-image][POST] tenant context:", ctx);

    if (!ctx?.tenantId) {
      console.error("[location-image][POST] unauthorized — no tenant");
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    await query(
      `
      INSERT INTO location_clips (location_id, clip_id)
      SELECT $1, $2
      FROM locations
      WHERE id = $1
        AND tenant_id = $3
      `,
      [location_id, clip_id, ctx.tenantId]
    );

    console.log(
      "[location-image][POST] image attached",
      { location_id, clip_id }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[location-image][POST] UNCAUGHT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE — remove image from Location
============================================================ */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("location_id");

    console.log("[location-image][DELETE] location_id:", locationId);

    if (!locationId) {
      console.error("[location-image][DELETE] missing location_id");
      return NextResponse.json(
        { ok: false, error: "missing location_id" },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(req);
    console.log("[location-image][DELETE] tenant context:", ctx);

    if (!ctx?.tenantId) {
      console.error("[location-image][DELETE] unauthorized — no tenant");
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const result = await query(
      `
      UPDATE location_clips lc
         SET deleted_at = NOW()
        FROM locations l
       WHERE lc.location_id = $1
         AND l.id = lc.location_id
         AND l.tenant_id = $2
         AND lc.deleted_at IS NULL
      `,
      [locationId, ctx.tenantId]
    );

    console.log(
      "[location-image][DELETE] rows affected:",
      result.rowCount
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[location-image][DELETE] UNCAUGHT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal server error" },
      { status: 500 }
    );
  }
}
