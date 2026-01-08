import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 */
export async function POST(req) {
  try {
    /* --------------------------------
       Rate limiting
       -------------------------------- */
    let limit = { ok: true };

    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

      limit = await rateLimit({
        ip,
        route: "login",
      });
    } catch {
      // Never block auth on rate-limit infra
    }

    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429 }
      );
    }

    const { emailOrUsername, password } = await req.json();

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

    /* --------------------------------
       Lookup user
       -------------------------------- */
    const result = await query(
      `
      SELECT id, password_hash, deleted_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR LOWER(username) = LOWER($1)
      LIMIT 1
      `,
      [emailOrUsername]
    );

    if (!result.rows.length) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    if (user.deleted_at) {
      return NextResponse.json(
        { error: "Account disabled" },
        { status: 403 }
      );
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    /* --------------------------------
       Resolve tenant
       -------------------------------- */
    const tenantRes = await query(
      `
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = $1
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [user.id]
    );

    if (!tenantRes.rows.length) {
      return NextResponse.json(
        { error: "No tenant access assigned" },
        { status: 403 }
      );
    }

    const tenantId = tenantRes.rows[0].tenant_id;

    /* --------------------------------
       SESSION ROTATION
       -------------------------------- */
    await query(
      `DELETE FROM user_sessions WHERE user_id = $1`,
      [user.id]
    );

    /* --------------------------------
       Create new session
       -------------------------------- */
    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("hex");

    await query(
      `
      INSERT INTO user_sessions (
        id,
        user_id,
        tenant_id,
        token,
        created_at,
        expires_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW() + interval '30 days')
      `,
      [sessionId, user.id, tenantId, token]
    );

    /* --------------------------------
       Set cookie
       -------------------------------- */
    const response = NextResponse.json({
      ok: true,
      debug: {
        userId: user.id,
        tenantId,
        sessionId,
      },
    });

    response.cookies.set("lw_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
