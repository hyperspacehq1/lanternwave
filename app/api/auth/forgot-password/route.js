import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        route: "forgot-username",
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
      SELECT username
      FROM users
      WHERE LOWER(email) = LOWER($1)
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length) {
      const { username } = result.rows[0];

      try {
        // ✅ LAZY IMPORT (BUILD SAFE)
        const { sendForgotUsernameEmail } = await import("@/lib/server/email");

        await sendForgotUsernameEmail({
          to: email,
          username,
          userAgent: req.headers.get("user-agent"),
        });

        console.log("FORGOT USERNAME EMAIL SENT", { email });
      } catch (emailErr) {
        console.error("FORGOT USERNAME EMAIL FAILED", {
          email,
          error: emailErr?.message,
        });
      }
    }

    /* -------------------------
       Always return OK
       ------------------------- */
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("FORGOT USERNAME ERROR:", err);
    return NextResponse.json({ ok: true });
  }
}

