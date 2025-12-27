import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   GET /api/campaign-packages
   Used to populate Campaign creation dropdown
-------------------------------------------------- */
export async function GET(req) {
  // Auth required (same pattern as campaigns)
  try {
    await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ---------------------------------------------
     Fetch Adventure Codex templates
  --------------------------------------------- */
  const { rows } = await query(
    `
    SELECT
      campaign_package AS value,
      name              AS label,
      description
    FROM campaigns
    WHERE tenant_id IS NULL
      AND template_campaign_id IS NULL
      AND deleted_at IS NULL
    ORDER BY name ASC
    `
  );

  /* ---------------------------------------------
     Always include Standard (no codex)
  --------------------------------------------- */
  const packages = [
    {
      value: "standard",
      label: "Standard (Blank Campaign)",
      description: "Start with an empty campaign and build it manually.",
    },
    ...rows,
  ];

  return Response.json(packages);
}
