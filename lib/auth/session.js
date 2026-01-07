// /lib/auth/session.js

import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";
import { query } from "@/lib/db";

/* ======================================================
   CREATE SESSION
   ====================================================== */

export async function createSession({
  userId,
  tenantId,
  response,
  ttlDays = 7,
}) {
  const sessionId = randomUUID();

  const h = headers();

  const ip =
    h.get("x-forwarded-for")?.split(",")[0] ||
    h.get("x-real-ip") ||
    null;

  const userAgent = h.get("user-agent") || null;

  await query(
    `
    INSERT INTO user_sessions (
      id,
      user_id,
      tenant_id,
      expires_at,
      ip_address,
      user_agent
    )
    VALUES (
      $1,
      $2,
      $3,
      NOW() + make_interval(days => $4),
      $5,
      $6
    )
    `,
    [sessionId, userId, tenantId, ttlDays, ip, userAgent]
  );

  response.cookies.set({
    name: "lw_session",
    value: sessionId,
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    domain: ".lanternwave.com",
    maxAge: 60 * 60 * 24 * ttlDays,
  });

  return sessionId;
}

/* ======================================================
   REQUIRE SESSION
   ====================================================== */

export async function requireSession() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get("lw_session")?.value;

  if (!sessionId) {
    throw new Error("UNAUTHENTICATED");
  }

  const result = await query(
    `
    SELECT
      s.id        AS session_id,
      s.user_id,
      s.tenant_id,
      u.email,
      tu.role
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    JOIN tenant_users tu
      ON tu.user_id = s.user_id
     AND tu.tenant_id = s.tenant_id
    WHERE s.id = $1
      AND s.expires_at > NOW()
    `,
    [sessionId]
  );

  if (result.rowCount === 0) {
    throw new Error("INVALID_SESSION");
  }

  return result.rows[0];
}

/* ======================================================
   DESTROY SESSION
   ====================================================== */

export async function destroySession(response) {
  const cookieStore = cookies();
  const sessionId = cookieStore.get("lw_session")?.value;

  if (sessionId) {
    await query(
      `DELETE FROM user_sessions WHERE id = $1`,
      [sessionId]
    );
  }

  response.cookies.set({
    name: "lw_session",
    value: "",
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    domain: ".lanternwave.com",
  });
}
