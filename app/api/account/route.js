import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   GET /api/account  (DEBUG ENABLED)
-------------------------------------------------- */
export async function GET(req) {
  // 🔎 DEBUG — req is ONLY accessed here (build-safe)
  const debug = {
    cookieHeader: req.headers.get("cookie"),
    userAgent: req.headers.get("user-agent"),
    hasCookie: Boolean(req.headers.get("cookie")),
  };

  console.log("🧪 /api/account GET DEBUG", debug);

  let session;
  try {
    session = await requireAuth();
  } catch (err) {
    console.warn("🛑 /api/account AUTH FAILED", {
      ...debug,
      error: err?.message,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
        debug,
      },
      { status: 401 }
    );
  }

  try {
    const tenantId = session.tenant_id;
    const userId = session.id;

    const { rows } = await query(
      `
      SELECT beacons
        FROM account_preferences
       WHERE tenant_id = $1
         AND user_id   = $2
       ORDER BY updated_at DESC
       LIMIT 1
      `,
      [tenantId, userId]
    );

    return NextResponse.json({
      ok: true,
      account: {
        username: session.username,
        tenant_id: tenantId,
        user_id: userId,
        beacons: rows[0]?.beacons ?? {},
      },
      debug,
    });
  } catch (err) {
    console.error("🔥 /api/account GET ERROR", {
      ...debug,
      error: err,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load account",
        debug,
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------
   PUT /api/account
-------------------------------------------------- */
export async function PUT(req) {
  const debug = {
    cookieHeader: req.headers.get("cookie"),
  };

  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unauthorized", debug },
      { status: 401 }
    );
  }

  try {
    const tenantId = session.tenant_id;
    const userId = session.id;

    const { key, enabled } = await req.json();

    if (!key || typeof enabled !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "Invalid beacon update", debug },
        { status: 400 }
      );
    }

    const update = await query(
      `
      UPDATE account_preferences
         SET beacons = COALESCE(beacons, '{}'::jsonb)
                       || jsonb_build_object($1::text, $2::boolean),
             updated_at = NOW()
       WHERE tenant_id = $3
         AND user_id   = $4
       RETURNING beacons
      `,
      [key, enabled, tenantId, userId]
    );

    if (update.rows.length) {
      return NextResponse.json({
        ok: true,
        beacons: update.rows[0].beacons,
      });
    }

    const insert = await query(
      `
      INSERT INTO account_preferences (
        id, tenant_id, user_id, beacons, updated_at
      )
      VALUES (
        $1, $2, $3,
        jsonb_build_object($4::text, $5::boolean),
        NOW()
      )
      RETURNING beacons
      `,
      [uuid(), tenantId, userId, key, enabled]
    );

    return NextResponse.json({
      ok: true,
      beacons: insert.rows[0]?.beacons ?? {},
    });
  } catch (err) {
    console.error("🔥 /api/account PUT ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update beacon", debug },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------
   POST /api/account  (multipart upload)
-------------------------------------------------- */
export async function POST(req) {
  const debug = {
    cookieHeader: req.headers.get("cookie"),
    contentType: req.headers.get("content-type"),
  };

  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", debug },
      { status: 401 }
    );
  }

  try {
    const tenantId = session.tenant_id;

    if (!debug.contentType?.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data", debug },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file received", debug },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { ingestAdventureCodex } = await import("@/lib/ai/orchestrator");

    const result = await ingestAdventureCodex({
      buffer,
      tenantId,
    });

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("🔥 /api/account POST ERROR", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error", debug },
      { status: 500 }
    );
  }
}
