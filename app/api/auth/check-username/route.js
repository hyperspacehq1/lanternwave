import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ available: false });
  }

  const normalized = username.trim().toLowerCase();

  const res = await query(
    "SELECT 1 FROM users WHERE username_normalized = $1",
    [normalized]
  );

  return NextResponse.json({
    available: res.rowCount === 0,
  });
}

