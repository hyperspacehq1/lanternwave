import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

export async function POST(req) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { code: "MISSING_FIELDS", message: "All fields are required." },
        { status: 400 }
      );
    }

    const usernameNormalized = normalizeUsername(username);

    /* -------------------------
       Begin transaction
       ------------------------- */
    await query("BEGIN");

    const emailExists = await query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );
    if (emailExists.rowCount > 0) {
      await query("ROLLBACK");
      return NextResponse.json(
        { code: "EMAIL_EXISTS", message: "Email already in use." },
        { status: 409 }
      );
    }

    const usernameExists = await query(
      "SELECT 1 FROM users WHERE username_normalized = $1",
      [usernameNormalized]
    );
    if (usernameExists.rowCount > 0) {
      await query("ROLLBACK");
      return NextResponse.json(
        { code: "USERNAME_EXISTS", message: "Username already taken." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userRes = await query(
      `
      INSERT INTO users (
        id,
        email,
        username,
        username_normalized,
        password_hash
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4)
      RETURNING id
      `,
      [email, username, usernameNormalized, passwordHash]
    );

    const userId = userRes.rows[0].id;
    const tenantId = randomUUID();

    await query(
      `INSERT INTO tenants (id, name) VALUES ($1, $2)`,
      [tenantId, `${username}'s Account`]
    );

    await query(
      `
      INSERT INTO tenant_users (
        user_id,
        tenant_id,
        role,
        created_at
      )
      VALUES ($1, $2, 'owner', NOW())
      `,
      [userId, tenantId]
    );

    await query("COMMIT");

    /* -------------------------
       Auto-login (2025 NETLIFY SAFE)
       ------------------------- */
    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: "lw_session",
      value: userId,
      httpOnly: true,
      secure: true,                 // REQUIRED
      sameSite: "none",             // REQUIRED
      path: "/",
      domain: ".lanternwave.com",   // 🔑 REQUIRED FOR FUNCTIONS
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;

  } catch (err) {
    try {
      await query("ROLLBACK");
    } catch {}

    console.error("SIGNUP FAILED:", err);

    return new NextResponse(
      JSON.stringify({
        code: "SIGNUP_FAILED",
        message: err?.message || "Internal signup error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
