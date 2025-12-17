import { headers, cookies } from "next/headers";
import { traceId, log } from "@/lib/debug/trace";

export function getTenantContext({ allowAnonymous = false } = {}) {
  const tid = traceId();
  log(tid, "ENTER getTenantContext");

  try {
    let cookieHeader = null;

    // ------------------------------------------------------------
    // 🔍 HARD SIGNAL: log ALL cookie names seen by App Router
    // ------------------------------------------------------------
    try {
      const c = cookies?.();
      const names = c?.getAll?.().map(x => x.name) ?? [];
      log(tid, "COOKIES SEEN", names);
    } catch (e) {
      log(tid, "COOKIES ENUM ERROR", e?.message);
    }

    // ------------------------------------------------------------
    // Attempt headers()
    // ------------------------------------------------------------
    try {
      const h = headers?.();
      log(tid, "headers() type", typeof h);
      log(tid, "headers() keys", h ? [...(h.keys?.() ?? [])] : null);

      if (h && typeof h.get === "function") {
        cookieHeader = h.get("cookie");
        log(tid, "cookie from headers()", cookieHeader);
      }
    } catch (e) {
      log(tid, "headers() ERROR", e?.message);
    }

    // ------------------------------------------------------------
    // Attempt cookies() (value inspection only)
    // NOTE: DO NOT assume cookie name yet
    // ------------------------------------------------------------
    if (!cookieHeader) {
      try {
        const c = cookies?.();
        log(tid, "cookies() type", typeof c);

        if (c && typeof c.get === "function") {
          // ⚠️ TEMP: do NOT hardcode cookie name
          // We only want visibility, not decoding yet
          const all = c.getAll?.() ?? [];
          if (all.length > 0) {
            cookieHeader = "[cookie-present]";
            log(tid, "cookie exists (value redacted)");
          }
        }
      } catch (e) {
        log(tid, "cookies() ERROR", e?.message);
      }
    }

    // ------------------------------------------------------------
    // No cookies reachable
    // ------------------------------------------------------------
    if (!cookieHeader) {
      log(tid, "NO COOKIE FOUND");
      if (allowAnonymous) {
        return { tenantId: null, prefix: null, userId: null };
      }
      throw new Error("No cookies");
    }

    // ------------------------------------------------------------
    // ⚠️ DEBUG MODE: do not decode yet
    // ------------------------------------------------------------
    log(tid, "COOKIE PRESENT, RETURN SENTINEL");

    return {
      tenantId: "DEBUG_TENANT",
      prefix: "DEBUG_PREFIX",
      userId: "DEBUG_USER",
    };
  } catch (err) {
    log(tid, "TENANT ERROR", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });

    if (allowAnonymous) {
      return { tenantId: null, prefix: null, userId: null };
    }
    throw err;
  } finally {
    log(tid, "EXIT getTenantContext");
  }
}
