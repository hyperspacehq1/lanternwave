import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    console.log("🔐 LOGIN START");

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    try {
      const rl = await rateLimit({ ip, route: "login" });
      if (!rl.ok) {
        return NextResponse.json(
          { error: "Too many attempts" },
          { status: 429 }
        );
      }
    } catch (e) {
      console.warn("⚠️ rateLimit failed", e);
    }

    const body = await req.json();
    console.log("📥 LOGIN BODY", body);

    const { emailOrUsername, password } = body;

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

    const userRes = await query(
      `
      SELECT id, email, username, password_hash, deleted_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR LOWER(username) = LOWER($1)
      LIMIT 1
      `,
      [emailOrUsername]
    );

    console.log("👤 USER QUERY RESULT", userRes.rows);

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

    const passwordOk = await bcrypt.compare(
      password,
      user.password_hash
    );

    console.log("🔑 PASSWORD OK?", passwordOk);

    if (!passwordOk) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

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

    console.log("🏢 TENANT RESULT", tenantRes.rows);

    if (!tenantRes.rows.length) {
      return NextResponse.json(
        { error: "No tenant access" },
        { status: 403 }
      );
    }

    const tenantId = tenantRes.rows[0].tenant_id;

    // 🔥 THIS IS THE MOST LIKELY FAILURE POINT
    console.log("🧨 CLEARING OLD SESSIONS");
    await query(`DELETE FROM user_sessions WHERE user_id = $1`, [
      user.id,
    ]);

    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("hex");

    console.log("🧪 INSERT SESSION", {
      sessionId,
      userId: user.id,
      tenantId,
    });

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
      VALUES ($1,$2,$3,$4,NOW(),NOW() + interval '30 days')
      `,
      [sessionId, user.id, tenantId, token]
    );

    const res = NextResponse.json({
      ok: true,
      debug: {
        userId: user.id,
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

    console.log("✅ LOGIN SUCCESS");

    return res;
  } catch (err) {
    console.error("🔥 LOGIN HARD FAIL", err);

    return NextResponse.json(
      {
        error: "LOGIN_FAILED",
        message: err?.message,
        stack: err?.stack,
      },
      { status: 500 }
    );
  }
}
