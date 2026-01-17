import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT /api/account/password
 *
 * Body:
 * {
 *   currentPassword: string,
 *   newPassword: string
 * }
 */
export async function PUT(req) {
  try {
    /* --------------------------------
       Auth (logged-in only)
       -------------------------------- */
    let user;
    try {
      user = await getSessionUser(req);
    } catch {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /* --------------------------------
       Optional rate limit (non-fatal)
       -------------------------------- */
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

      const rl = await rateLimit({
        ip,
        route: "change-password",
      });

      if (!rl.ok) {
        return NextResponse.json(
          { error: "Too many attempts" },
          { status: 429 }
        );
      }
    } catch {
      // Rate limit must never block password change
    }

    /* --------------------------------
       Parse body
       -------------------------------- */
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing password fields" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    /* --------------------------------
       Fetch current hash
       -------------------------------- */
    const result = await query(
      `
      SELECT password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [user.id]
    );

    if (!result.rows.length) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const ok = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 403 }
      );
    }

    /* --------------------------------
       Update password + timestamp
       -------------------------------- */
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await query(
      `
      UPDATE users
      SET password_hash = $1,
          password_changed_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      `,
      [passwordHash, user.id]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
