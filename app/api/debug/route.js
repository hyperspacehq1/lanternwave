import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // Prove req exists
  if (!req || !req.headers) {
    throw new Error("NO REQUEST OBJECT");
  }

  // Prove auth + tenant resolution
  const { tenantId, user } = await getTenantContext(req);

  // Prove DB access works
  const { rows } = await query(
    `SELECT id FROM tenants WHERE id = $1`,
    [tenantId]
  );

  if (rows.length === 0) {
    throw new Error("Tenant not found in DB");
  }

  return Response.json({
    ok: true,
    message: "Debug root route works",
    tenantId,
    user,
    sampleId: "test-123",
  });
}
