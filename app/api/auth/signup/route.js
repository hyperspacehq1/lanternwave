import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await query(
      `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email
      `,
      [email, hash]
    );

    return NextResponse.json({
      ok: true,
      user: result.rows[0],
    });
  } catch (err) {
    // 🔥 THIS IS THE MONEY SHOT
    console.error("SIGNUP ERROR (FULL):", err);

    return NextResponse.json(
      {
        error: "Signup failed",
        message: err.message,
        code: err.code,
        detail: err.detail,
        hint: err.hint,
      },
      { status: 500 }
    );
  }
}
