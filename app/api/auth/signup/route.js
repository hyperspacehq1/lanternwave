import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

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

    const passwordHash = await bcrypt.hash(password, 10);
    const tenantId = randomUUID();

    const result = await query(
      `
      WITH new_tenant AS (
        INSERT INTO tenants (id)
        VALUES ($1)
      ),
      new_user AS (
        INSERT INTO users (
          email,
          password_hash,
          tenant_id
        )
        VALUES ($2, $3, $1)
        RETURNING id, email, tenant_id
      )
      SELECT * FROM new_user
      `,
      [
        tenantId,
        email,
        passwordHash,
      ]
    );

    return NextResponse.json({
      ok: true,
      user: result.rows[0],
    });
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
