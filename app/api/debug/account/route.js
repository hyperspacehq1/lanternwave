import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Robust header getter (works if headers is Web Headers OR plain object)
function getHeader(req, name) {
  const key = String(name).toLowerCase();
  const h = req?.headers;

  if (!h) return null;

  // Web Headers interface
  if (typeof h.get === "function") {
    return h.get(key);
  }

  // Plain object
  if (typeof h === "object") {
    return h[key] ?? h[name] ?? h[key.toLowerCase()] ?? null;
  }

  return null;
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;

  cookieHeader.split(";").forEach((part) => {
    const s = part.trim();
    if (!s) return;
    const idx = s.indexOf("=");
    if (idx === -1) return;
    const k = s.slice(0, idx).trim();
    const v = s.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });

  return out;
}

export async function GET(req) {
  try {
    const cookieHeader = getHeader(req, "cookie") || "";
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

    // Core truth #1: does the server see the cookie at all?
    if (!lwSession) {
      return NextResponse.json({
        ok: true,
        debug,
        note:
          "Server does NOT see lw_session in the request Cookie header. Fix cookie delivery first.",
      });
    }

    // Your current design: lw_session === user_id
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
          "Server sees lw_session, but no user exists with that ID in DB (cookie value mismatch or wrong DB).",
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
        : "User found, but no tenant_users row found for this user.",
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
