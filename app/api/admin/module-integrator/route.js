import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  try {
    // 1. Authenticate user
    const ctx = await getTenantContext(req);

    if (!ctx || !ctx.isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    // 2. Read uploaded file
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file uploaded" }),
        { status: 400 }
      );
    }

    // 3. Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 4. Run ingestion pipeline
    const result = await ingestAdventureCodex({
      buffer,
      tenantId: ctx.tenantId,
    });

    // 5. Resolve entity relationships
    await resolveEncounterRelationships({
      templateCampaignId: result.templateCampaignId,
    });

    // 6. Success
    return new Response(
      JSON.stringify({
        success: true,
        templateCampaignId: result.templateCampaignId,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Module ingestion failed:", err);

    return new Response(
      JSON.stringify({
        error: err?.message || "Internal server error",
      }),
      { status: 500 }
    );
  }
}
