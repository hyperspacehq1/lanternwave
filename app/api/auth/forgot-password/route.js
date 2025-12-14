import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/email";

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
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const limit = await rateLimit({
      ip,
      route: "forgot-password",
    });

    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    // Find user (do NOT reveal if missing)
    const userRes = await db.query(
      `
      SELECT id, first_name
      FROM users
      WHERE LOWER(email) = LOWER($1)
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [email]
    );

    if (!userRes.rows.length) {
      // Prevent email enumeration
      return NextResponse.json({ ok: true });
    }

    const { id: userId, first_name } = userRes.rows[0];

    // Generate reset code
    const code = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db.query(
      `
      INSERT INTO email_verifications (user_id, code, expires_at)
      VALUES ($1, $2, $3)
      `,
      [userId, code, expiresAt]
    );

    // Send Postmark email (2025 template compliant)
    const resetUrl = `https://lanternwave.com/reset-password?code=${code}`;

    await sendPasswordResetEmail({
      to: email,
      resetUrl,
      firstName: first_name,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
