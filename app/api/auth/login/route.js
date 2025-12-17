import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

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

    /* --------------------------------
       SET COOKIE (FINAL 2025 FORM)
       -------------------------------- */
    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: "lw_session",
      value: user.id,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      domain: ".lanternwave.com", // 🔑 REQUIRED FOR NETLIFY FUNCTIONS
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
