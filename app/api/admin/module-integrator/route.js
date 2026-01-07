export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth-server";
import { query } from "@/lib/db";

export async function POST(req) {
  console.log("🚀 /api/admin/module-integrator called");

  try {
    // 🔐 Auth required
    const session = await requireAuth();
    if (!session || !session.tenant_id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const tenantId = session.tenant_id;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      console.error("❌ No file uploaded");
      return new Response(
        JSON.stringify({ error: "No file uploaded" }),
        { status: 400 }
      );
    }

    console.log("📄 File received:", file.name, file.size);

    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("🧠 Starting ingestion…");

    // ✅ LAZY IMPORT (BUILD SAFE)
    const { ingestAdventureCodex } = await import(
      "@/lib/ai/orchestrator"
    );

    let result;
    try {
      result = await ingestAdventureCodex({
        buffer,
        tenantId,
      });
    } catch (err) {
      console.error("🔥 ingestAdventureCodex FAILED:", err);
      return new Response(
        JSON.stringify({
          error: "Ingest failed",
          details: err?.message || String(err),
        }),
        { status: 500 }
      );
    }

    if (!result || !result.title) {
      console.error("❌ Invalid ingest result:", result);
      return new Response(
        JSON.stringify({
          error: "Ingest returned no usable data",
          result,
        }),
        { status: 500 }
      );
    }

    console.log("💾 Writing campaign to DB…");

    const insertResult = await query(
      `
      INSERT INTO campaigns (
        tenant_id,
        name,
        description,
        campaign_package,
        rpg_game
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        tenantId,
        result.title,
        result.summary ?? null,
        "standard",
        result.rpg_game ?? null,
      ]
    );

    console.log("✅ Campaign inserted:", insertResult.rows[0]);

    return new Response(
      JSON.stringify({
        status: "success",
        campaignId: insertResult.rows[0].id,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("🔥 FATAL ROUTE ERROR:", err);
    return new Response(
      JSON.stringify({
        error: "Unhandled server error",
        detail: err?.message,
      }),
      { status: 500 }
    );
  }
}
