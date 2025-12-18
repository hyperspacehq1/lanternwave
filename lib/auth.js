/**
 * IMPORTANT
 * =========
 * This file is SAFE to import from CLIENT or SERVER.
 *
 * - No next/headers
 * - No cookies()
 * - No database
 * - No redirects
 * - No tenant resolution
 *
 * ALL real authentication + tenant logic
 * MUST happen in API routes via getTenantContext(req)
 */

/**
 * Legacy header name kept ONLY so existing client
 * code does not crash during migration.
 *
 * It is NOT used for auth in this app.
 */
export const ADMIN_HEADER_KEY = "x-admin-api-key";

/**
 * Legacy no-op.
 * Client code may call this, but it returns nothing.
 *
 * Real auth is enforced server-side.
 */
export function getAdminKey() {
  return "";
}

/**
 * Explicit guard for accidental misuse.
 * If someone tries to use server auth from here,
 * it fails loudly instead of silently.
 */
export function requireAuth() {
  throw new Error(
    "requireAuth() is not supported in this app. " +
    "Use getTenantContext(req) inside API routes only."
  );
}

export function getAuthContext() {
  throw new Error(
    "getAuthContext() is not supported in this app. " +
    "Use getTenantContext(req) inside API routes only."
  );
}
