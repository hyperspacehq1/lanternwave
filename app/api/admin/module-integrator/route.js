export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { unstable_parseMultipartFormData } from "next/server";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

export async function POST(req) {
  try {
    console.log("🚀 Route invoked");

    const ctx = await getTenantContext(req);
    if (!ctx) throw new Error("Unauthorized");

    const formData = await unstable_parseMultipartFormData(req);
    const file = formData.get("file");

    if (!file) {
      throw new Error("No file uploaded");
    }

    console.log("📄 File:", file.name, file.size);

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
    console.error("🔥 UPLOAD ERROR:", err);

    return new Response(
      JSON.stringify({
        error: err.message,
        stack: err.stack,
      }),
      { status: 500 }
    );
  }
}
