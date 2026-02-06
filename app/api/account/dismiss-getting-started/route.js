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
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const userId = ctx.user.id;

    await query(
      `
      UPDATE users
         SET hide_getting_started = TRUE
       WHERE id = $1
      `,
      [userId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Failed to dismiss getting started" },
      { status: 500 }
    );
  }
}