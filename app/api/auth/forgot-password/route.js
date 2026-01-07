import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password
 *
 * Body:
 * {
 *   email: string
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
        route: "forgot-password",
      });
    } catch (err) {
      // Rate limiting must NEVER break password recovery
      console.warn("Rate limit skipped (forgot-password):", err);
    }

    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    /* --------------------------------
       Parse request
       -------------------------------- */
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    /* --------------------------------
       Find user (no enumeration)
       -------------------------------- */
    const userRes = await query(
      `
      SELECT id, first_name
      FROM users
      WHERE LOWER(email) = LOWER($1)
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [email]
    );

    // Always return ok to prevent enumeration
    if (!userRes.rows.length) {
      return NextResponse.json({ ok: true });
    }

    const { id: userId, first_name } = userRes.rows[0];

    /* --------------------------------
       Generate reset token
       -------------------------------- */
    const code = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await query(
      `
      INSERT INTO email_verifications (user_id, code, expires_at)
      VALUES ($1, $2, $3)
      `,
      [userId, code, expiresAt]
    );

    /* --------------------------------
       Send reset email
       -------------------------------- */
    const resetUrl = `https://lanternwave.com/reset-password?code=${code}`;

 try {
await sendPasswordResetEmail({
  to: email,
  resetUrl,
  username: first_name,
  userAgent: req.headers.get("user-agent"),
});

  console.log("PASSWORD RESET EMAIL SENT", {
    email,
    userId,
  });
} catch (emailErr) {
  console.error("PASSWORD RESET EMAIL FAILED", {
    email,
    userId,
    error: emailErr?.message,
  });

  throw emailErr; // keep current behavior
}

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);

    // Guaranteed JSON response
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
