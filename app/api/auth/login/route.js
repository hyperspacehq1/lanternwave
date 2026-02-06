import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.AUTH_SECRET;

/**
 * Create signed stateless auth cookie
 */
function signSession(payload) {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  return `${body}.${sig}`;
}

export async function POST(req) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Rate limit (non-fatal)
    try {
      const rl = await rateLimit({ ip, route: "login" });
      if (!rl.ok) {
        return NextResponse.json(
          { error: "Too many attempts" },
          { status: 429 }
        );
      }
    } catch (e) {
      // rateLimit failure is non-fatal; proceed with login
    }

    const { emailOrUsername, password } = await req.json();

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

    // --- find user ---
    const userRes = await query(
      `
      SELECT id, password_hash, deleted_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR LOWER(username) = LOWER($1)
      LIMIT 1
      `,
      [emailOrUsername]
    );

    if (!userRes.rows.length) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = userRes.rows[0];

    if (user.deleted_at) {
      return NextResponse.json(
        { error: "Account disabled" },
        { status: 403 }
      );
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // --- resolve tenant ---
    const tenantRes = await query(
      `
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = $1
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [user.id]
    );

    if (!tenantRes.rows.length) {
      return NextResponse.json(
        { error: "No tenant access" },
        { status: 403 }
      );
    }

    const tenantId = tenantRes.rows[0].tenant_id;

    // --- stateless signed cookie ---
    const token = signSession({
      userId: user.id,
      tenantId,
    });

    const res = NextResponse.json({ ok: true });

    res.cookies.set("lw_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}