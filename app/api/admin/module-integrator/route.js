export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

export async function POST(req) {
  try {
    console.log("🚀 Route hit");

    const ctx = await getTenantContext(req);
    console.log("CTX:", ctx);

    const formData = await req.formData();
    console.log("FormData received");

    const file = formData.get("file");
    if (!file) throw new Error("No file in form data");

    console.log("File:", file.name, file.type, file.size);

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("Buffer length:", buffer.length);

    const result = await ingestAdventureCodex({
      buffer,
      tenantId: ctx.tenantId,
    });

    console.log("Ingest result:", result);

    return Response.json({ success: true, result });
  } catch (err) {
    console.error("🔥 FULL ERROR:", err);

    return new Response(
      JSON.stringify({
        error: err.message,
        stack: err.stack,
      }),
      { status: 500 }
    );
  }
}
