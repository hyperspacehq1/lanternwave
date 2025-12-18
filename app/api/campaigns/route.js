import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const ctx = await getTenantContext(req);

  return Response.json({
    ok: true,
    message: "campaigns route reached",
    tenantId: ctx.tenantId,
    user: ctx.user,
  });
}
