import { headers, cookies } from "next/headers";
import { traceId, log } from "@/lib/debug/trace";

export function getTenantContext({ allowAnonymous = false } = {}) {
  const tid = traceId();
  log(tid, "ENTER getTenantContext");

  try {
    let cookieHeader = null;

    // ---- headers()
    try {
      const h = headers?.();
      log(tid, "headers() type", typeof h);
      log(tid, "headers() keys", h ? [...h.keys?.() ?? []] : null);

      if (h && typeof h.get === "function") {
        cookieHeader = h.get("cookie");
        log(tid, "cookie from headers()", cookieHeader);
      }
    } catch (e) {
      log(tid, "headers() ERROR", e?.message);
    }

    // ---- cookies()
    if (!cookieHeader) {
      try {
        const c = cookies?.();
        log(tid, "cookies() type", typeof c);
        log(tid, "cookies() keys", c ? c.getAll?.().map(x => x.name) : null);

        if (c && typeof c.get === "function") {
          cookieHeader = c.get("session")?.value ?? null;
          log(tid, "cookie from cookies()", cookieHeader);
        }
      } catch (e) {
        log(tid, "cookies() ERROR", e?.message);
      }
    }

    if (!cookieHeader) {
      log(tid, "NO COOKIE FOUND");
      if (allowAnonymous) {
        return { tenantId: null, prefix: null, userId: null };
      }
      throw new Error("No cookies");
    }

    // ⚠️ DO NOT decode yet — just return sentinel
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
