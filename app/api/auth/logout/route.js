import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: "lw_session",
    value: "",
    httpOnly: true,
    secure: true,        // REQUIRED for SameSite=None
    sameSite: "none",    // 🔑 MUST match login route
    path: "/",
    maxAge: 0,           // Immediately expire
  });

  return response;
}
