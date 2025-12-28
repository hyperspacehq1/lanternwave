export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";

export async function POST(req) {
  console.log("🚀 [ModuleIntegrator] Request received");

  try {
    const ctx = await getTenantContext(req);
    if (!ctx) {
      console.error("❌ No tenant context");
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      console.error("❌ No file found in request");
      return new Response("No file uploaded", { status: 400 });
    }

    console.log("📄 File received:", file.name, file.size);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Respond immediately so request does not timeout
    const response = new Response(
      JSON.stringify({ status: "processing" }),
      { status: 202 }
    );

    // 🔥 Background processing (non-blocking)
    queueMicrotask(async () => {
      try {
        console.log("🧠 Starting AI ingestion...");

        const result = await ingestAdventureCodex({
          buffer,
          tenantId: ctx.tenantId,
        });

        console.log("🧠 AI RESULT:", result);

        const insert = await db.insert(campaigns).values({
          title: result.title ?? "Imported Module",
          description: result.summary ?? "Generated from uploaded document",
          source: "upload",
        });

        console.log("✅ Campaign saved:", insert);
      } catch (err) {
        console.error("🔥 Background ingestion failed:", err);
      }
    });

    return response;
  } catch (err) {
    console.error("🔥 Route failure:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
