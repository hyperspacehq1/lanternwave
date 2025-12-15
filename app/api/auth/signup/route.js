import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "Email, username, and password are required" },
        { status: 400 }
      );
    }

    // Prevent duplicate accounts
    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rowCount > 0) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Create user
    const userRes = await query(
      `
      INSERT INTO users (id, email, username, password_hash)
      VALUES (gen_random_uuid(), $1, $2, $3)
      RETURNING id
      `,
      [email, username, passwordHash]
    );

    const userId = userRes.rows[0].id;
    const tenantId = randomUUID();

    // 2. Create tenant owned by this user
    await query(
      `
      INSERT INTO tenants (id, owner_user_id)
      VALUES ($1, $2)
      `,
      [tenantId, userId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);

    return NextResponse.json(
      {
        error: "Signup failed",
        message: err.message,
        code: err.code,
      },
      { status: 500 }
    );
  }
}
