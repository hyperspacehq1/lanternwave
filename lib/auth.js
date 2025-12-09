export const ADMIN_HEADER_KEY = "x-admin-api-key";

export function requireAdmin(req) {
  const header = req.headers.get(ADMIN_HEADER_KEY);
  const expected = process.env.ADMIN_API_KEY;

  if (!header || header !== expected) {
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }

  return { ok: true };
}

export function authAdmin(req) {
  return requireAdmin(req);
}
