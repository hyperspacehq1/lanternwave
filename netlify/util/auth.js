// netlify/util/auth.js

// 2025 Netlify-Compatible Admin Auth Middleware
export function requireAdmin(headers = {}) {
  // Normalize header keys for case-insensitive matching
  const normalized = {};
  for (const key in headers) {
    normalized[key.toLowerCase()] = headers[key];
  }

  // Accept any of these header names
  const adminHeader =
    normalized["x-admin-key"] ||
    normalized["admin-key"] ||
    normalized["authorization"]; // optional fallback

  // Validate against environment variable
  const expected = process.env.ADMIN_KEY;

  if (!expected) {
    console.error("❌ ADMIN_KEY is NOT configured in Netlify Environment Variables");
    return {
      ok: false,
      response: {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Server config error: ADMIN_KEY missing" }),
      },
    };
  }

  if (!adminHeader || adminHeader !== expected) {
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
