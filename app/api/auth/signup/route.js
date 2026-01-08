import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

export async function POST(req) {
  try {
    const { email, username, password, birthdate } = await req.json();

    if (!email || !username || !password || !birthdate) {
      return NextResponse.json(
        {
          code: "MISSING_FIELDS",
          message: "Email, username, password, and birthdate are required.",
        },
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
        password_hash,
        birthdate
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      RETURNING id
      `,
      [email, username, usernameNormalized, passwordHash, birthdate]
    );

    const userId = userRes.rows[0].id;
    const tenantId = crypto.randomUUID();

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

    /* -------------------------
       Create session
       ------------------------- */
    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("hex");

    await query(
      `
      INSERT INTO user_sessions (
        id,
        user_id,
        tenant_id,
        token,
        created_at,
        expires_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW() + interval '30 days')
      `,
      [sessionId, userId, tenantId, token]
    );

    await query("COMMIT");

    const res = NextResponse.json({
      ok: true,
      debug: {
        userId,
        tenantId,
        sessionId,
      },
    });

    res.cookies.set("lw_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    /* -------------------------
       Send welcome email (best-effort)
       ------------------------- */
    try {
      const { sendWelcomeEmail } = await import("@/lib/email");

      await sendWelcomeEmail({
        to: email,
        username,
        userAgent: req.headers.get("user-agent"),
      });
    } catch (emailErr) {
      console.error("WELCOME EMAIL FAILED", emailErr);
    }

    return res;
  } catch (err) {
    try {
      await query("ROLLBACK");
    } catch {}

    console.error("SIGNUP FAILED:", err);

    return NextResponse.json(
      {
        code: "SIGNUP_FAILED",
        message: err?.message || "Internal signup error",
      },
      { status: 500 }
    );
  }
}
