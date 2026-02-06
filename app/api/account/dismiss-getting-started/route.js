import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   POST /api/account/dismiss-getting-started
   Sets hide_getting_started = true for the user
-------------------------------------------------- */
export async function POST(req) {
  const debug = {
    cookieHeader: req.headers.get("cookie"),
  };

  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (err) {
    console.warn("🛑 /api/account/dismiss-getting-started AUTH FAILED", {
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

    await query(
      `
      UPDATE users
         SET hide_getting_started = TRUE
       WHERE id = $1
         AND tenant_id = $2
      `,
      [userId, tenantId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("🔥 /api/account/dismiss-getting-started POST ERROR", {
      ...debug,
      error: err,
    });

    return NextResponse.json(
      { ok: false, error: "Failed to dismiss getting started", debug },
      { status: 500 }
    );
  }
}