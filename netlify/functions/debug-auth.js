// File: netlify/functions/debug-auth.js
// Purpose: Verify admin authentication + environment variables safely.

import { requireAdmin } from "../util/auth.js";

export default async function handler(req) {
  try {
    // Step 1: Test requireAdmin()
    const authCheck = requireAdmin(req.headers || {});

    // Step 2: Extract request headers (redact sensitive values)
    const safeHeaders = {};
    for (const key in req.headers) {
      if (key.toLowerCase().includes("key")) {
        safeHeaders[key] = "[REDACTED]";
      } else {
        safeHeaders[key] = req.headers[key];
      }
    }

    // Step 3: Verify ADMIN_KEY exists server-side
    const adminEnv = process.env.ADMIN_KEY ? "Loaded ✔" : "Missing ❌";

    // Step 4: Prepare response payload
    const payload = {
      ok: authCheck.ok,
      message: authCheck.ok
        ? "Admin authentication succeeded."
        : "Admin authentication FAILED.",
      serverEnv: {
        ADMIN_KEY: adminEnv,
      },
      requestHeaders: safeHeaders,
      expectedHeaderValue: "[REDACTED]",
      instructions:
        "Send header: { 'x-admin-key': YOUR_ADMIN_KEY } with this request.",
    };

    // If unauthorized, return the custom auth.js response
    if (!authCheck.ok) return authCheck.response;

    // Otherwise return debug output
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload, null, 2),
    };
  } catch (err) {
    console.error("Debug-auth error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal debug error", details: err.message }),
    };
  }
}
