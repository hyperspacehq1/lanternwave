import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  console.log("🚀 /api/admin/module-integrator called");

  try {
    let ctx;
    try {
      ctx = await getTenantContext(req);
    } catch {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const tenantId = ctx.tenantId;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file uploaded" }),
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { ingestAdventureCodex } = await import(
      "@/lib/ai/orchestrator"
    );

    const result = await ingestAdventureCodex({
      buffer,
      tenantId,
    });

    if (!result || !result.title) {
      return new Response(
        JSON.stringify({ error: "Invalid ingest result" }),
        { status: 500 }
      );
    }

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
