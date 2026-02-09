import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPhoneUserAgent(ua = "") {
  const isMobile =
    /iphone|ipod|android.*mobile|windows phone/i.test(ua);

  const isTablet =
    /ipad|android(?!.*mobile)/i.test(ua);

  return isMobile && !isTablet;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ua = request.headers.get("user-agent") || "";
  const hasSession = request.cookies.get("lw_session");

  /* -------------------------------------------------
     SKIP STATIC ASSETS (so video/images load on mobile)
  -------------------------------------------------- */
  if (/\.(mp4|webm|ogg|png|jpe?g|gif|svg|ico|css|js|woff2?|ttf|eot)$/i.test(pathname)) {
    return NextResponse.next();
  }

  /* -------------------------------------------------
     PHONE BLOCK (runs first)
  -------------------------------------------------- */
  if (
    isPhoneUserAgent(ua) &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    !pathname.startsWith("/forgot") &&
    !pathname.startsWith("/mobile-unsupported")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/mobile-unsupported";
    return NextResponse.rewrite(url);
  }

  /* -------------------------------------------------
     EXISTING AUTH RULE (unchanged)
  -------------------------------------------------- */
  if (!hasSession && pathname.startsWith("/gm-dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/* -------------------------------------------------
   Apply middleware broadly (NOT just gm-dashboard)
-------------------------------------------------- */
export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};