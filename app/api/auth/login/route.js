import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/auth/login
 *
 * Body:
 * {
 *   emailOrUsername: string,
 *   password: string
 * }
 */
export async function POST(req) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const limit = await rateLimit({
      ip,
      route: "login",
    });

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

    // Find user (email OR username)
    const result = await query(
      `
      SELECT
        u.id,
        u.email,
        u.username,
        u.password_hash,
        u.deleted_at
      FROM users u
      WHERE
        LOWER(u.email) = LOWER($1)
        OR LOWER(u.username) = LOWER($1)
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

    // Verify password
    const passwordOk = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordOk) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Ensure tenant access
    const tenantCheck = await query(
      `
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = $1
      LIMIT 1
      `,
      [user.id]
    );

    if (!tenantCheck.rows.length) {
      return NextResponse.json(
        { error: "No tenant access assigned" },
        { status: 403 }
      );
    }

    // Set session cookie
    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: "lw_session",
      value: user.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
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
