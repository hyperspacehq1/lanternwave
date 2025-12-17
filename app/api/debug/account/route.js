import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function headerSnapshot() {
  try {
    const h = headers();
    const out = {};
    for (const [k, v] of h.entries()) {
      const key = k.toLowerCase();
      if (key === "cookie") {
        out[key] = "(present)";
      } else if (
        key.startsWith("x-forwarded-") ||
        key.startsWith("x-nf-") ||
        key === "host" ||
        key === "user-agent" ||
        key === "referer" ||
        key === "origin"
      ) {
        out[key] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const cookieStore = cookies();

    // 🔑 ONLY read what we actually need
    const lwSessionCookie = cookieStore.get("lw_session");
    const lwSessionValue = lwSessionCookie?.value || null;

    const debug = {
      server: {
        sawLwSession: lwSessionValue ? "(present)" : "(missing)",
        headers: headerSnapshot(),
      },
      auth: {
        userId: null,
        username: null,
        email: null,
        tenantId: null,
      },
    };

    // If server does NOT see the cookie, stop here (this is the core signal)
    if (!lwSessionValue) {
      return NextResponse.json(
        {
          ok: true,
          debug,
          note:
            "Server does NOT see lw_session cookie. Auth cannot work until this is resolved.",
        },
        { status: 200 }
      );
    }

    // In your current system, lw_session === user_id
    const userId = lwSessionValue;

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
      return NextResponse.json(
        {
          ok: true,
          debug,
          note:
            "Server sees lw_session, but no user exists with this ID in the database.",
        },
        { status: 200 }
      );
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

    return NextResponse.json(
      {
        ok: true,
        debug,
        note: debug.auth.tenantId
          ? "Auth + tenant lookup succeeded."
          : "User found, but no tenant_users row found for this user.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[debug account] error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "debug endpoint threw",
        message: err?.message || String(err),
      },
      { status: 200 }
    );
  }
}
