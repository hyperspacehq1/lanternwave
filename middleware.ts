import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // No logic yet — just allow request through
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
