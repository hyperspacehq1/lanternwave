import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.AUTH_SECRET;

/* --------------------------------
   Verify stateless session cookie
-------------------------------- */
function verifySession(token) {
  if (!token) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("hex");

  if (sig !== expected) return null;

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

/**
 * PUT /api/account/password
 */
export async function PUT(req) {
  try {
    /* --------------------------------
       Auth (cookie-based)
    -------------------------------- */
    const cookie = req.cookies.get("lw_session")?.value;
    const session = verifySession(cookie);

    if (!session?.userId) {
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
      // must not block password change
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
       Fetch + verify current password
    -------------------------------- */
    const result = await query(
      `
      SELECT password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [session.userId]
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
      [passwordHash, session.userId]
    );

const res = NextResponse.json({ ok: true });

// Invalidate session cookie (force re-login)
res.cookies.set("lw_session", "", {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 0,
});

return res;

  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
