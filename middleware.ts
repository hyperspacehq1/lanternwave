// /middleware.ts
import { NextResponse } from "next/server";

export function middleware(request) {
  const hasSession = request.cookies.get("lw_session");

  if (!hasSession && request.nextUrl.pathname.startsWith("/gm-dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/gm-dashboard/:path*"],
};
