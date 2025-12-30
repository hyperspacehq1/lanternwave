import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 *
 * Body:
 * {
 *   code: string,
 *   password: string
 * }
 */
export async function POST(req) {
  try {
    /* --------------------------------
       SAFE rate limiting (2025)
       -------------------------------- */
    let limit = { ok: true };

    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

      limit = await rateLimit({
        ip,
        route: "reset-password",
      });
    } catch (err) {
      // Rate limiting must NEVER break password reset
      console.warn("Rate limit skipped (reset-password):", err);
    }

    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }

    /* --------------------------------
       Parse request
       -------------------------------- */
    const { code, password } = await req.json();

    if (!code || !password) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    /* --------------------------------
       Validate reset token
       -------------------------------- */
    const result = await query(
      `
      SELECT ev.id, ev.user_id
      FROM email_verifications ev
      WHERE ev.code = $1
        AND ev.expires_at > NOW()
        AND ev.consumed_at IS NULL
      LIMIT 1
      `,
      [code]
    );

    if (!result.rows.length) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    const { id: verificationId, user_id } = result.rows[0];

    const passwordHash = await bcrypt.hash(password, 10);

    /* --------------------------------
       Update password
       -------------------------------- */
    await query(
      `
      UPDATE users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [passwordHash, user_id]
    );

    /* --------------------------------
       Consume reset tokens
       -------------------------------- */
    // Consume THIS token
    await query(
      `
      UPDATE email_verifications
      SET consumed_at = NOW()
      WHERE id = $1
      `,
      [verificationId]
    );

    // Invalidate any other outstanding tokens
    await query(
      `
      UPDATE email_verifications
      SET consumed_at = NOW()
      WHERE user_id = $1
        AND consumed_at IS NULL
      `,
      [user_id]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);

    // Guaranteed JSON response
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
