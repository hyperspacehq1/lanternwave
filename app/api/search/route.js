import { sanitizeRows } from "@/lib/api/sanitize";
import { runSearch } from "@/lib/search/runSearch";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  if (!q) {
    return Response.json({ query: "", results: [] });
  }

  const rows = await runSearch({
    tenantId,
    q,
    limit,
  });

  const results = sanitizeRows(
    rows.map((r) => ({
      entityType: r.entity_type,
      id: r.id,
      campaignId: r.campaign_id,
      label: r.label,
      rank: Number(r.rank),
      snippet: r.snippet,
    })),
    {
      entityType: 40,
      id: 50,
      campaignId: 50,
      label: 200,
      snippet: 500,
    }
  );

  return Response.json({
    query: q,
    results,
  });
}
