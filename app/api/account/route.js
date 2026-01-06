import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   GET /api/account
   - returns account info + beacons (single source)
-------------------------------------------------- */
export async function GET(req) {
  try {
    const ctx = await getTenantContext(req);

    if (!ctx?.user || !ctx?.tenantId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { rows } = await query(
      `
      select beacons
      from account_preferences
      where tenant_id = $1
        and user_id = $2
      order by updated_at desc
      limit 1
      `,
      [ctx.tenantId, ctx.user.id]
    );

    return NextResponse.json({
      ok: true,
      account: {
        username: ctx.user.username,
        beacons: rows[0]?.beacons ?? {},
      },
    });
  } catch (err) {
    console.error("🔥 ACCOUNT GET ERROR:", err);

    return NextResponse.json(
      { ok: false, error: "Failed to load account" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------
   PUT /api/account
   - updates beacons (replaces /api/beacons PUT)
-------------------------------------------------- */
export async function PUT(req) {
  try {
    const ctx = await getTenantContext(req);

    if (!ctx?.user || !ctx?.tenantId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { key, enabled } = await req.json();

    if (!key || typeof enabled !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "Invalid beacon update" },
        { status: 400 }
      );
    }

    const { rows } = await query(
      `
      insert into account_preferences (id, tenant_id, user_id, beacons)
      values ($1, $2, $3, jsonb_build_object($4, $5))
      on conflict (tenant_id, user_id)
      do update set
        beacons = coalesce(account_preferences.beacons, '{}'::jsonb)
                  || jsonb_build_object($4, $5),
        updated_at = now()
      returning beacons
      `,
      [uuid(), ctx.tenantId, ctx.user.id, key, enabled]
    );

    return NextResponse.json({
      ok: true,
      beacons: rows[0]?.beacons ?? {},
    });
  } catch (err) {
    console.error("🔥 ACCOUNT PUT ERROR:", err);

    return NextResponse.json(
      { ok: false, error: "Failed to update beacon" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------
   POST /api/account
   - multipart upload (UNCHANGED)
-------------------------------------------------- */
export async function POST(req) {
  try {
    console.log("🚀 [account upload] Route invoked");

    const ctx = await getTenantContext(req);
    if (!ctx?.tenantId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized or missing tenant context" }),
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data" }),
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file received" }),
        { status: 400 }
      );
    }

    console.log("📄 Upload received:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await ingestAdventureCodex({
      buffer,
      tenantId: ctx.tenantId,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    console.error("🔥 ACCOUNT ROUTE ERROR:", err);

    return new Response(
      JSON.stringify({
        error: err?.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
      }),
      { status: 500 }
    );
  }
}
