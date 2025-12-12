import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export function GET(req) {
  const auth = requireAdmin(req);

  return NextResponse.json({
    authorized: auth.ok,
    headerReceived: req.headers.get("x-admin-api-key"),
    expected: process.env.ADMIN_API_KEY
  });
}
