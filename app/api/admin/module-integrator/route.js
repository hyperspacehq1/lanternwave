export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { query } from "@/lib/db";

export async function POST(req) {
  try {
    const ctx = await getTenantContext(req);
    if (!ctx) return new Response("Unauthorized", { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return new Response("No file uploaded", { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await ingestAdventureCodex({
      buffer,
      tenantId: ctx.tenantId,
    });

    await query(
      `
      INSERT INTO campaigns (
        tenant_id,
        name,
        description,
        campaign_package,
        rpg_game,
        external_source
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        ctx.tenantId,
        result.title ?? "Imported Module",
        result.summary ?? null,
        "standard",
        result.rpg_game ?? null,
        "upload",
      ]
    );

    return new Response(
      JSON.stringify({ status: "ok" }),
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
