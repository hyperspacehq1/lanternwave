import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export async function POST(req) {
  try {
    const { emailOrUsername, password } = await req.json();

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

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

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const tenantCheck = await query(
      `SELECT tenant_id FROM tenant_users WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );

    if (!tenantCheck.rows.length) {
      return NextResponse.json(
        { error: "No tenant access assigned" },
        { status: 403 }
      );
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set("lw_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("LOGIN FATAL ERROR:", err);

    return new NextResponse(
      JSON.stringify({
        error: "Login failed",
        detail: err?.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
