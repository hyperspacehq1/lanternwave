import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import crypto from "crypto";

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
    /* -------------------------
       Rate limit
       ------------------------- */
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

      await rateLimit({
        ip,
        route: "forgot-password",
      });
    } catch {
      // Never block auth on rate-limit infra
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ ok: true });
    }

    /* -------------------------
       Lookup user (no enumeration)
       ------------------------- */
    const result = await query(
      `
      SELECT id, email, username
      FROM users
      WHERE LOWER(email) = LOWER($1)
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length) {
      const user = result.rows[0];

      /* -------------------------
         Generate reset code
         ------------------------- */
      const resetCode = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset code in email_verifications table
      await query(
        `
        INSERT INTO email_verifications (user_id, code, expires_at)
        VALUES ($1, $2, $3)
        `,
        [user.id, resetCode, expiresAt]
      );

      /* -------------------------
         Build reset URL
         ------------------------- */
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lanternwave.com";
      const resetUrl = `${baseUrl}/reset-password?code=${resetCode}`;

      /* -------------------------
         Send reset email
         ------------------------- */
      try {
        // ✅ LAZY IMPORT (BUILD SAFE)
        const { sendPasswordResetEmail } = await import("@/lib/server/email");

        await sendPasswordResetEmail({
          to: email,
          resetUrl: resetUrl,
          username: user.username,
          userAgent: req.headers.get("user-agent"),
        });
      } catch (emailErr) {
        console.error("PASSWORD RESET EMAIL FAILED", {
          email,
          error: emailErr?.message,
        });
      }
    }

    /* -------------------------
       Always return OK (security best practice)
       ------------------------- */
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return NextResponse.json({ ok: true });
  }
}
