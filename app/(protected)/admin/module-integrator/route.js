import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const ctx = await getTenantContext(req);
    const tenantId = ctx.tenantId;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const events = [];

    const result = await ingestAdventureCodex({
      buffer,
      tenantId,
      onEvent: (event) => {
        events.push({
          ...event,
          at: new Date().toISOString(),
        });
      },
    });

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

    return Response.json({
      status: "success",
      campaignId: insertResult.rows[0].id,
      events,
    });
  } catch (err) {
    return Response.json(
      {
        status: "error",
        error: err?.message ?? "Unhandled server error",
      },
      { status: 500 }
    );
  }
}
