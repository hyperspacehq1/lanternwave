import { query } from "@/lib/db";

/**
 * Resolve tenant + user context from an explicit request.
 * This is the ONLY supported way to get tenant context.
 *
 * @param {Request | { headers: any }} req
 * @param {Object} options
 * @param {boolean} options.allowAnonymous
 */
export async function getTenantContext(
  req,
  { allowAnonymous = false } = {}
) {
  if (!req || !req.headers) {
    throw new Error(
      "getTenantContext(req) requires an explicit request object"
    );
  }

  // --- header access (Node / Netlify / AWS safe) ---
  const header =
    typeof req.headers.get === "function"
      ? (name) => req.headers.get(name)
      : (name) =>
          req.headers[name] ??
          req.headers[name.toLowerCase()] ??
          null;

  const cookieHeader = header("cookie") || "";

  // --- parse cookies ---
  const cookies = {};
  cookieHeader.split(";").forEach((part) => {
    const s = part.trim();
    if (!s) return;
    const idx = s.indexOf("=");
    if (idx === -1) return;
    const k = s.slice(0, idx);
    const v = s.slice(idx + 1);
    cookies[k] = decodeURIComponent(v);
  });

  const lwSession = cookies["lw_session"];

  if (!lwSession) {
    if (allowAnonymous) {
      return {
        authenticated: false,
        user: null,
        tenant: null,
        tenantId: null,
        role: null,
      };
    }

    throw new Error("No lw_session cookie present");
  }

  // --- resolve user ---
  const userRes = await query(
    `
    select id, username, email
    from users
    where id = $1
    limit 1
    `,
    [lwSession]
  );

  const user = userRes.rows[0];

  if (!user) {
    if (allowAnonymous) {
      return {
        authenticated: false,
        user: null,
        tenant: null,
        tenantId: null,
        role: null,
      };
    }

    throw new Error("Invalid lw_session (user not found)");
  }

  // --- resolve tenant + role ---
  const tenantRes = await query(
    `
    select
      t.*,
      tu.role
    from tenants t
    join tenant_users tu on tu.tenant_id = t.id
    where tu.user_id = $1
    order by tu.created_at asc
    limit 1
    `,
    [user.id]
  );

  const tenantRow = tenantRes.rows[0] || null;

  if (!tenantRow && !allowAnonymous) {
    throw new Error("User has no tenant");
  }

  return {
    authenticated: true,
    user,
    tenant: tenantRow,
    tenantId: tenantRow?.id ?? null,
    role: tenantRow?.role ?? null,
  };
}
