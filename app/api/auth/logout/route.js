import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });

  // Explicitly clear the session cookie
  response.cookies.set("lw_session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
