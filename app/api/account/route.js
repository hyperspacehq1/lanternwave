export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

export async function POST(req) {
  try {
    console.log("🚀 Route invoked");

    const ctx = await getTenantContext(req);
    console.log("CTX:", ctx);

    const formData = await req.formData();
    console.log("Form data keys:", [...formData.keys()]);

    const file = formData.get("file");
    if (!file) {
      throw new Error("No file received in multipart form");
    }

    console.log("File info:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("Buffer length:", buffer.length);

    const result = await ingestAdventureCodex({
      buffer,
      tenantId: ctx.tenantId,
    });

    console.log("Ingest complete:", result);

    return Response.json({ success: true, result });

  } catch (err) {
    console.error("🔥 FATAL ERROR:", err);

    // IMPORTANT: return the error string so it shows in browser
    return new Response(
      JSON.stringify({
        error: err?.message || "Unknown error",
        stack: err?.stack,
      }),
      { status: 500 }
    );
  }
}
