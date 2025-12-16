import "server-only";
import { cookies } from "next/headers";

/**
 * Resolve tenant context from cookies.
 * This is the single source of truth for tenant resolution (Option A).
 */
export function getTenantContext() {
  const cookieStore = cookies();

  // Adjust these names ONLY if your app uses different cookie keys
  const tenantId =
    cookieStore.get("tenant_id")?.value ||
    cookieStore.get("tenant")?.value;

  if (!tenantId) {
    throw new Error("Tenant context missing (no tenant cookie found)");
  }

  return {
    tenantId,
    prefix: `tenants/${tenantId}`,
  };
}
