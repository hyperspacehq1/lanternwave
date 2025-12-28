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

    console.log("📄 File received:", file.name);

    const buffer = Buffer.from(await file.arrayBuffer());

    // ✅ RUN INGESTION SYNCHRONOUSLY
    const result = await ingestAdventureCodex({
      buffer,
      tenantId: ctx.tenantId,
    });

    console.log("🧠 Ingestion result:", result);

    // ✅ INSERT INTO DATABASE
    const dbResult = await query(
      `
      INSERT INTO campaigns (title, description, source)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [
        result.title ?? "Imported Module",
        result.summary ?? "Generated from uploaded document",
        "upload",
      ]
    );

    console.log("✅ Campaign inserted:", dbResult.rows[0]);

    return new Response(
      JSON.stringify({
        status: "complete",
        campaignId: dbResult.rows[0].id,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("🔥 Upload failed:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
