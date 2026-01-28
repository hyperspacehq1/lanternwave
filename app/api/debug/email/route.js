import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { to, template } = await req.json();

    if (!to || !template) {
      return NextResponse.json(
        { error: "Missing 'to' or 'template'" },
        { status: 400 }
      );
    }

    // Lazy import to avoid build-time coupling
    const {
      sendWelcomeEmail,
      sendPasswordResetEmail,
      sendForgotUsernameEmail,
    } = await import("@/lib/server/email");

    const userAgent = "Debug Page / Manual Trigger";

    let result;

    switch (template) {
      case "welcome":
        result = await sendWelcomeEmail({
          to,
          username: "DebugUser",
          userAgent,
        });
        break;

      case "password-reset":
        result = await sendPasswordResetEmail({
          to,
          username: "DebugUser",
          userAgent,
          resetUrl: "https://lanternwave.com/reset/debug-token",
        });
        break;

      case "forgot-username":
        result = await sendForgotUsernameEmail({
          to,
          username: "DebugUser",
          userAgent,
        });
        break;

      default:
        return NextResponse.json(
          { error: "Unknown template" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      ok: true,
      postmark: result,
    });
  } catch (err) {
    console.error("EMAIL DEBUG FAILED", err);
    return NextResponse.json(
      { error: err?.message || "Email send failed" },
      { status: 500 }
    );
  }
}
