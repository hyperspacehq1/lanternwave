import { headers, cookies } from "next/headers";

/**
 * Resolve tenant context safely in Next.js App Router (2025)
 * - Defensive against RSC prefetch
 * - Defensive against missing headers()
 * - Defensive against missing cookies()
 *
 * @param {Object} options
 * @param {boolean} options.allowAnonymous
 */
export function getTenantContext({ allowAnonymous = false } = {}) {
  try {
    let cookieHeader = null;

    // ------------------------------------------------------------
    // Attempt to read cookies from headers() safely
    // ------------------------------------------------------------
    try {
      const hdrs = headers?.();
      if (hdrs && typeof hdrs.get === "function") {
        cookieHeader = hdrs.get("cookie");
      }
    } catch {
      // headers() not available in this execution path
    }

    // ------------------------------------------------------------
    // Fallback: attempt to read cookies() safely
    // ------------------------------------------------------------
    if (!cookieHeader) {
      try {
        const c = cookies?.();
        if (c && typeof c.get === "function") {
          // adjust cookie name if yours differs
          cookieHeader = c.get("session")?.value ?? null;
        }
      } catch {
        // cookies() not available
      }
    }

    // ------------------------------------------------------------
    // No cookies → RSC prefetch / unauthenticated GET
    // ------------------------------------------------------------
    if (!cookieHeader) {
      if (allowAnonymous) {
        return {
          tenantId: null,
          prefix: null,
          userId: null,
        };
      }
      throw new Error("No cookies available");
    }

    // ------------------------------------------------------------
    // EXISTING tenant decode logic (UNCHANGED)
    // ------------------------------------------------------------
    // Example (keep your current logic here):
    //
    // const { tenantId, userId } = decodeSession(cookieHeader);
    // const prefix = `tenant/${tenantId}`;
    //
    // ⬇️⬇️⬇️ DO NOT CHANGE YOUR EXISTING LOGIC ⬇️⬇️⬇️

    const { tenantId, userId, prefix } = decodeTenantFromCookies(
      cookieHeader
    );

    // ------------------------------------------------------------
    // Enforce tenant only when required
    // ------------------------------------------------------------
    if (!tenantId && !allowAnonymous) {
      throw new Error("Tenant context missing");
    }

    return {
      tenantId,
      prefix,
      userId,
    };
  } catch (err) {
    if (allowAnonymous) {
      return {
        tenantId: null,
        prefix: null,
        userId: null,
      };
    }
    throw err;
  }
}
