import crypto from "crypto";
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

  // --- header access (Node / AWS / Netlify safe) ---
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

  const raw = cookies["lw_session"];

  if (!raw) {
    if (allowAnonymous) {
      return {
        authenticated: false,
        user: null,
        tenant: null,
        tenantId: null,
        role: null,
        debug: { reason: "no_cookie" },
      };
    }

    throw new Error("No lw_session cookie present");
  }

  // --- verify signed cookie payload ---
  const SECRET = process.env.AUTH_SECRET;
  if (!SECRET) {
    throw new Error("AUTH_SECRET is not set");
  }

  const [payloadB64, sig] = raw.split(".");
  if (!payloadB64 || !sig) {
    throw new Error("Malformed lw_session cookie");
  }

  const expectedSig = crypto
    .createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("hex");

  if (
    expectedSig.length !== sig.length ||
    !crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(sig)
    )
  ) {
    throw new Error("Invalid lw_session signature");
  }

  let payload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );
  } catch {
    throw new Error("Invalid lw_session payload");
  }

  const userId = payload?.userId;

  if (!userId) {
    throw new Error("lw_session missing userId");
  }

  // --- resolve user ---
  const userRes = await query(
    `
  select id, username, email, is_admin
from users
where id = $1
limit 1
    `,
    [userId]
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
        debug: { reason: "user_not_found" },
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
    debug: {
      cookiePresent: true,
      userId,
      tenantId: tenantRow?.id ?? null,
    },
  };
}
