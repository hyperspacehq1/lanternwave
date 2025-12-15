import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * Pragmatic email validation:
 * - ASCII only
 * - No quoted local parts
 * - No consecutive dots
 * - Reasonable domain rules
 */
function isValidEmail(email) {
  if (typeof email !== "string") return false;
  if (!/^[\x00-\x7F]+$/.test(email)) return false;

  const parts = email.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;

  if (local.length < 1 || local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return false;
  }
  if (!/^[A-Za-z0-9._+-]+$/.test(local)) return false;

  const labels = domain.split(".");
  if (labels.some(l => l.length < 1 || l.length > 63)) return false;
  if (
    labels.some(
      l =>
        !/^[A-Za-z0-9-]+$/.test(l) ||
        l.startsWith("-") ||
        l.endsWith("-")
    )
  ) {
    return false;
  }

  return true;
}

export async function POST(req) {
  try {
    const { email, username, password } = await req.json();

    /* -------------------------
       Required field validation
       ------------------------- */
    if (!email || !username || !password) {
      return NextResponse.json(
        {
          code: "MISSING_FIELDS",
          message: "Email, username, and password are required.",
        },
        { status: 400 }
      );
    }

    /* -------------------------
       Email validation
       ------------------------- */
    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          code: "INVALID_EMAIL",
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    /* -------------------------
       Duplicate email check
       ------------------------- */
    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rowCount > 0) {
      return NextResponse.json(
        {
          code: "EMAIL_EXISTS",
          message: "An account already exists for this email.",
        },
        { status: 409 }
      );
    }

    /* -------------------------
       Password hashing
       ------------------------- */
    const passwordHash = await bcrypt.hash(password, 10);

    /* -------------------------
       Create user
       ------------------------- */
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

    /* -------------------------
       Create tenant owned by user
       ------------------------- */
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
        code: "SIGNUP_FAILED",
        message: err.message || "Unable to create account.",
      },
      { status: 500 }
    );
  }
}
