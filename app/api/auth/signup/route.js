import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/auth/signup
 *
 * Body:
 * {
 *   email: string,
 *   username: string,
 *   password: string,
 *   tenantName: string
 * }
 */
export async function POST(req) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const limit = await rateLimit({
      ip,
      route: "signup",
    });

    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many signups. Try again later." },
        { status: 429 }
      );
    }

    const { email, username, password, tenantName } = await req.json();

    if (!email || !username || !password || !tenantName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Prevent duplicates
    const existing = await db.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR LOWER(username) = LOWER($2)
      LIMIT 1
      `,
      [email, username]
    );

    if (existing.rows.length) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);

    const userRes = await db.query(
      `
      INSERT INTO users (email, username, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [email, username, passwordHash]
    );

    const userId = userRes.rows[0].id;

    // Create tenant
    const tenantRes = await db.query(
      `
      INSERT INTO tenants (name)
      VALUES ($1)
      RETURNING id
      `,
      [tenantName]
    );

    const tenantId = tenantRes.rows[0].id;

    // Link user → tenant
    await db.query(
      `
      INSERT INTO tenant_users (tenant_id, user_id, role)
      VALUES ($1, $2, 'owner')
      `,
      [tenantId, userId]
    );

    // Set session cookie
    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: "lw_session",
      value: userId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
