export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

export async function POST(req) {
  try {
    console.log("🚀 Route hit");

    const ctx = await getTenantContext(req);
    if (!ctx) {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await req.formData(); // ✅ correct API
    const file = formData.get("file");

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    console.log("📄 File received:", file.name, file.size);

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await ingestAdventureCodex({
      buffer,
      tenantId: ctx.tenantId,
    });

    await resolveEncounterRelationships({
      templateCampaignId: result.templateCampaignId,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("🔥 Upload failed:", err);
    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      { status: 500 }
    );
  }
}
