// netlify/util/auth.js
export function requireAdmin(headers = {}) {
  const key =
    headers["x-admin-key"] ||
    headers["X-Admin-Key"] ||
    headers["x-admin-key".toLowerCase()];

  if (!key || key !== process.env.ADMIN_KEY) {
    return {
      ok: false,
      response: {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      },
    };
  }

  return { ok: true };
}
