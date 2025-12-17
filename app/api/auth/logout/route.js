import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: "lw_session",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    domain: ".lanternwave.com", // 🔑 MUST match login & signup
    maxAge: 0,                  // Immediately expire
  });

  return response;
}
