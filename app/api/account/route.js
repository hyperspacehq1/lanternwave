import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   GET /api/account  (DEBUG ENABLED)
-------------------------------------------------- */
export async function GET(req) {
  const debug = {
    cookieHeader: req.headers.get("cookie"),
    userAgent: req.headers.get("user-agent"),
    hasCookie: Boolean(req.headers.get("cookie")),
  };

  console.log("🧪 /api/account GET DEBUG", debug);

  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (err) {
    console.warn("🛑 /api/account AUTH FAILED", {
      ...debug,
      error: err?.message,
    });

    return NextResponse.json(
      { ok: false, error: "Unauthorized", debug },
      { status: 401 }
    );
  }

  try {
    const tenantId = ctx.tenantId;
    const userId = ctx.user.id;

    const { rows } = await query(
  `
  SELECT beacons, audio
    FROM account_preferences
   WHERE tenant_id = $1
     AND user_id   = $2
   ORDER BY updated_at DESC
   LIMIT 1
  `,
  [tenantId, userId]
);

const userFlags = await query(
  `SELECT hide_getting_started FROM users WHERE id = $1 LIMIT 1`,
  [userId]
);

return NextResponse.json({
  ok: true,
  account: {
    username: ctx.user.username,
    tenant_id: tenantId,
    user_id: userId,
    beacons: rows[0]?.beacons ?? {},
    audio: rows[0]?.audio ?? { player_enabled: false },
    hide_getting_started: userFlags.rows[0]?.hide_getting_started ?? false,
  },
  debug,
});
  } catch (err) {
    console.error("🔥 /api/account GET ERROR", {
      ...debug,
      error: err,
    });

    return NextResponse.json(
      { ok: false, error: "Failed to load account", debug },
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

  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized", debug },
      { status: 401 }
    );
  }

  try {
    const tenantId = ctx.tenantId;
    const userId = ctx.user.id;

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

  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", debug },
      { status: 401 }
    );
  }

  try {
    const tenantId = ctx.tenantId;

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
