export const runtime = "nodejs";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

export async function POST(req) {
  try {
    console.log("🚀 Module Integrator invoked");

    const ctx = await getTenantContext(req);
    console.log("CTX:", ctx);

    if (!ctx || !ctx.isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file uploaded" }),
        { status: 400 }
      );
    }

    console.log("📄 File received:", file.name, file.type, file.size);

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("📦 Buffer size:", buffer.length);

    const result = await ingestAdventureCodex({
      buffer,
      tenantId: ctx.tenantId,
    });

    console.log("✅ Ingest complete", result);

    await resolveEncounterRelationships({
      templateCampaignId: result.templateCampaignId,
    });

    return Response.json({
      success: true,
      templateCampaignId: result.templateCampaignId,
    });

  } catch (err) {
    console.error("🔥 MODULE INTEGRATOR ERROR:", err);

    return new Response(
      JSON.stringify({
        error: err?.message || "Unknown server error",
        stack: err?.stack || null,
      }),
      { status: 500 }
    );
  }
}
