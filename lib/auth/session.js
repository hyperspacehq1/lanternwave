// /lib/auth/session.js

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

  await query(
    `
    INSERT INTO user_sessions (
      id,
      user_id,
      tenant_id,
      expires_at
    )
    VALUES (
      $1,
      $2,
      $3,
      NOW() + ($4 * INTERVAL '1 day')
    )
    `,
    [sessionId, userId, tenantId, ttlDays]
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
   DESTROY SESSION (LOGOUT)
   ====================================================== */

export async function destroySession(response, sessionId) {
  // Optional explicit sessionId (preferred)
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
