import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";

/**
 * ======================================================
 * ADMIN API AUTH (EXISTING – UNCHANGED BEHAVIOR)
 * ======================================================
 */

export const ADMIN_HEADER_KEY = "x-admin-api-key";

export function requireAdmin(req) {
  const header = req.headers.get(ADMIN_HEADER_KEY);
  const expected = process.env.ADMIN_API_KEY;

  if (!header || header !== expected) {
    return {
      ok: false,
      response: new Response("Unauthorized", { status: 401 }),
    };
  }

  return { ok: true };
}

export function authAdmin(req) {
  return requireAdmin(req);
}

/**
 * ======================================================
 * APP USER AUTH (NEW – COOKIE + TENANT AWARE)
 * ======================================================
 */

/**
 * Reads the current session cookie and resolves:
 *  - user
 *  - tenant
 *  - role
 *
 * Redirects to "/" if invalid.
 *
 * Used ONLY in authenticated layouts / pages.
 */
export async function requireAuth() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("lw_session");
  const userId = sessionCookie?.value;

  if (!userId) {
    redirect("/");
  }

  const result = await db.query(
    `
    SELECT
      u.id           AS user_id,
      u.email        AS email,
      u.username     AS username,
      tu.tenant_id   AS tenant_id,
      tu.role        AS role,
      t.name         AS tenant_name
    FROM users u
    JOIN tenant_users tu ON tu.user_id = u.id
    JOIN tenants t ON t.id = tu.tenant_id
    WHERE u.id = $1
      AND u.deleted_at IS NULL
      AND t.deleted_at IS NULL
    LIMIT 1
    `,
    [userId]
  );

  if (!result.rows.length) {
    redirect("/");
  }

  return result.rows[0];
}

/**
 * Non-redirecting version for API routes.
 * Returns null if unauthenticated.
 */
export async function getAuthContext() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("lw_session");
  const userId = sessionCookie?.value;

  if (!userId) return null;

  const result = await db.query(
    `
    SELECT
      u.id           AS user_id,
      tu.tenant_id   AS tenant_id,
      tu.role        AS role
    FROM users u
    JOIN tenant_users tu ON tu.user_id = u.id
    WHERE u.id = $1
      AND u.deleted_at IS NULL
    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}
