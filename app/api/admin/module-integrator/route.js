export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

export async function POST(req) {
  try {
    console.log("🚀 Module Integrator upload received");

    const ctx = await getTenantContext(req);
    if (!ctx) {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    // IMPORTANT:
    // Read the buffer immediately, before returning
    const buffer = Buffer.from(await file.arrayBuffer());

    // 🔥 RESPOND IMMEDIATELY — prevents Netlify / Vercel timeout
    const response = new Response(
      JSON.stringify({ status: "processing" }),
      { status: 202 }
    );

    // Run heavy work asynchronously (non-blocking)
    queueMicrotask(async () => {
      try {
        const result = await ingestAdventureCodex({
          buffer,
          tenantId: ctx.tenantId,
        });

        await resolveEncounterRelationships({
          templateCampaignId: result.templateCampaignId,
        });

        console.log("✅ Module ingestion complete");
      } catch (err) {
        console.error("🔥 Background processing failed:", err);
      }
    });

    return response;
  } catch (err) {
    console.error("🔥 Upload route error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
