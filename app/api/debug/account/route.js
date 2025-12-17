import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTenantContext } from "@/lib/tenant/server";
import { query } from "@/lib/db";

// Prevent render caching
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = getTenantContext({ allowAnonymous: false });

    if (!ctx?.userId || !ctx?.tenantId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user
    const { rows } = await query(
      `
      select id, username, email
      from users
      where id = $1
      limit 1
      `,
      [ctx.userId]
    );

    if (!rows[0]) {
      return NextResponse.json(
        { ok: false, error: "user not found" },
        { status: 404 }
      );
    }

    // Read cookie directly (server truth)
    const cookieStore = cookies();
    const sessionCookie =
      cookieStore.get("lw_session")?.value || null;

    return NextResponse.json({
      ok: true,
      user: {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
      },
      tenant: {
        id: ctx.tenantId,
      },
      cookie: {
        name: "lw_session",
        value: sessionCookie,
      },
    });
  } catch (err) {
    console.error("[debug account] error", err);
    return NextResponse.json(
      { ok: false, error: "debug failed" },
      { status: 500 }
    );
  }
}
