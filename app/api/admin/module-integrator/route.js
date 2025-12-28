export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { query } from "@/lib/db";

export async function POST(req) {
  console.log("🚀 Module Integrator hit");

  try {
    const ctx = await getTenantContext(req);
    if (!ctx) {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    console.log("📄 File received:", file.name, file.size);

    // Read file BEFORE responding
    const buffer = Buffer.from(await file.arrayBuffer());

    // Respond immediately to avoid timeout
    const response = new Response(
      JSON.stringify({ status: "processing" }),
      { status: 202 }
    );

    // Background processing
    queueMicrotask(async () => {
      try {
        console.log("🧠 Starting ingestion…");

        const result = await ingestAdventureCodex({
          buffer,
          tenantId: ctx.tenantId,
        });

        console.log("🧠 AI result:", result);

        await query(
          `
          INSERT INTO campaigns (title, description, source)
          VALUES ($1, $2, $3)
          `,
          [
            result.title ?? "Imported Module",
            result.summary ?? "Generated from uploaded document",
            "upload",
          ]
        );

        console.log("✅ Campaign saved to database");
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
