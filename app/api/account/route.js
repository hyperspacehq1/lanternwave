import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   GET /api/account
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
      SELECT beacons
        FROM account_preferences
       WHERE tenant_id = $1
         AND user_id   = $2
       ORDER BY updated_at DESC
       LIMIT 1
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
   - UPDATE first
   - INSERT only if row does not exist
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

    /* ---------- UPDATE (primary path) ---------- */
    const update = await query(
      `
      UPDATE account_preferences
         SET beacons = COALESCE(beacons, '{}'::jsonb)
                       || jsonb_build_object($1::text, $2::boolean),
             updated_at = NOW()
       WHERE tenant_id = $3::uuid
         AND user_id   = $4::uuid
       RETURNING beacons
      `,
      [key, enabled, ctx.tenantId, ctx.user.id]
    );

    if (update.rows.length) {
      return NextResponse.json({
        ok: true,
        beacons: update.rows[0].beacons,
      });
    }

    /* ---------- INSERT (fallback only) ---------- */
    const insert = await query(
      `
      INSERT INTO account_preferences (
        id,
        tenant_id,
        user_id,
        beacons,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        jsonb_build_object($4::text, $5::boolean),
        NOW()
      )
      RETURNING beacons
      `,
      [uuid(), ctx.tenantId, ctx.user.id, key, enabled]
    );

    return NextResponse.json({
      ok: true,
      beacons: insert.rows[0]?.beacons ?? {},
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

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await ingestAdventureCodex({
      buffer,
      tenantId: ctx.tenantId,
    });

    return NextResponse.json({ success: true, result });
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
