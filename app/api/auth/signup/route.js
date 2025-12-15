import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function isValidEmail(email) {
  if (typeof email !== "string") return false;
  if (!/^[\x00-\x7F]+$/.test(email)) return false;

  const parts = email.split("@");
  if (parts.length !== 2) return false;

  const [local] = parts;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return false;
  }
  return true;
}

export async function POST(req) {
  const client = await query.getClient();

  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { code: "MISSING_FIELDS", message: "All fields are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { code: "INVALID_EMAIL", message: "Invalid email address." },
        { status: 400 }
      );
    }

    const usernameNormalized = normalizeUsername(username);

    await client.query("BEGIN");

    // Email uniqueness
    const emailExists = await client.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );

    if (emailExists.rowCount > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { code: "EMAIL_EXISTS", message: "Email already in use." },
        { status: 409 }
      );
    }

    // Username uniqueness (case-insensitive)
    const usernameExists = await client.query(
      "SELECT 1 FROM users WHERE username_normalized = $1",
      [usernameNormalized]
    );

    if (usernameExists.rowCount > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { code: "USERNAME_EXISTS", message: "Username already taken." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userRes = await client.query(
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

    // Create tenant
    const tenantId = randomUUID();
    const tenantName = `${username}'s Account`;

    await client.query(
      `
      INSERT INTO tenants (id, name)
      VALUES ($1, $2)
      `,
      [tenantId, tenantName]
    );

    // 🔐 Link user → tenant (created_at REQUIRED)
    await client.query(
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

    await client.query("COMMIT");

    // 🔐 Auto-login
    cookies().set("lw_session", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("SIGNUP FAILED:", err);

    return NextResponse.json(
      { code: "SIGNUP_FAILED", message: "Unable to create account." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

