import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;

  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(v.join("="));
  });

  return out;
}

export async function GET() {
  try {
    const h = headers();
    const cookieHeader = h.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);

    const lwSession = cookies["lw_session"] || null;

    const debug = {
      server: {
        sawCookieHeader: cookieHeader ? "(present)" : "(missing)",
        sawLwSession: lwSession ? "(present)" : "(missing)",
      },
      auth: {
        userId: null,
        username: null,
        email: null,
        tenantId: null,
      },
    };

    // 🔴 THIS IS THE CORE TRUTH CHECK
    if (!lwSession) {
      return NextResponse.json({
        ok: true,
        debug,
        note:
          "Server does NOT see lw_session in Cookie header. Auth cannot work until this is resolved.",
      });
    }

    // In your system, lw_session === user_id
    const userId = lwSession;

    const userRes = await query(
      `
      select id, username, email
      from users
      where id = $1
      limit 1
      `,
      [userId]
    );

    if (!userRes.rows[0]) {
      debug.auth.userId = userId;
      return NextResponse.json({
        ok: true,
        debug,
        note:
          "Server sees lw_session cookie, but no user exists with this ID.",
      });
    }

    const user = userRes.rows[0];

    const tenantRes = await query(
      `
      select tenant_id
      from tenant_users
      where user_id = $1
      order by created_at asc
      limit 1
      `,
      [user.id]
    );

    debug.auth.userId = user.id;
    debug.auth.username = user.username;
    debug.auth.email = user.email;
    debug.auth.tenantId = tenantRes.rows[0]?.tenant_id || null;

    return NextResponse.json({
      ok: true,
      debug,
      note: debug.auth.tenantId
        ? "Auth + tenant lookup succeeded."
        : "User found, but no tenant_users row found.",
    });
  } catch (err) {
    console.error("[debug account] fatal error", err);
    return NextResponse.json({
      ok: false,
      error: "debug endpoint threw",
      message: err?.message || String(err),
    });
  }
}
