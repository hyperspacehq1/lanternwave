import { sanitizeRows } from "@/lib/api/sanitize";
import { requireAuth } from "@/lib/auth-server";
import { runSearch } from "@/lib/search/runSearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  let tenantId;
  try {
    const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Sanitize defensively (search is read-only, but consistent with API)
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
