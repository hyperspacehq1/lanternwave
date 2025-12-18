import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { tenantId, user } = await getTenantContext(req);

  return Response.json({
    ok: true,
    message: "Debug ID route works",
    id: params.id,
    tenantId,
    user,
  });
}
