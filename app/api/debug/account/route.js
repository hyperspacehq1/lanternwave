import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { query } from "@/lib/db";

// Prevent caching / render artifacts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeHeadersSnapshot() {
  try {
    const h = headers();
    // Only return a small, safe subset (avoid leaking secrets)
    const out = {};
    for (const [k, v] of h.entries()) {
      const key = k.toLowerCase();
      if (
        key === "cookie" ||
        key === "authorization" ||
        key === "x-nf-sign" ||
        key === "x-nf-request-id"
      ) {
        // redacted
        out[key] = key === "cookie" ? "(present)" : "(redacted)";
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
  // This endpoint should NEVER 401/500 just because auth is missing.
  // It must always return observability.
  try {
    const cookieStore = cookies();
    const all = cookieStore.getAll();
    const cookieNames = all.map((c) => c.name);

    const lwSession = cookieStore.get("lw_session")?.value || null;

    const debug = {
      server: {
        sawCookies: cookieNames,
        sawLwSession: lwSession ? "(present)" : "(missing)",
        headers: safeHeadersSnapshot(),
      },
      auth: {
        userId: null,
        tenantId: null,
        username: null,
        email: null,
      },
    };

    // If we don't even see the session cookie, we stop here with clarity.
    if (!lwSession) {
      return NextResponse.json(
        {
          ok: true,
          debug,
          note:
            "Server does not see lw_session cookie. This is the root issue. Fix cookie delivery first.",
        },
        { status: 200 }
      );
    }

    // lw_session is the user id in your current design
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
      return NextResponse.json(
        {
          ok: true,
          debug,
          note:
            "Server sees lw_session, but no matching user was found in DB for that userId.",
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
    // Even here, return structured data (don’t leave you blind)
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
