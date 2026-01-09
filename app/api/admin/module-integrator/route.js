import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   Helpers (match LanternWave pattern)
-------------------------------------------------- */
function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* -------------------------------------------------
   POST /api/admin/module-integrator
-------------------------------------------------- */
export async function POST(req) {
  // 🔐 Auth REQUIRED (Pattern A)
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return json(401, { error: "Unauthorized" });
  }

  const tenantId = ctx.tenantId;

  if (!tenantId) {
    return json(401, { error: "Missing tenant context" });
  }

  // -------------------------------------------------
  // Parse multipart form
  // -------------------------------------------------
  let formData;
  try {
    formData = await req.formData();
  } catch {
    return json(400, { error: "Invalid form data" });
  }

  const file = formData.get("file");

  if (!file) {
    return json(400, { error: "No file uploaded" });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // -------------------------------------------------
  // Lazy AI import (build-safe)
  // -------------------------------------------------
  const { ingestAdventureCodex } = await import(
    "@/lib/ai/orchestrator"
  );

  const events = [];

  try {
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

    // -------------------------------------------------
    // Persist campaign (existing behavior)
    // -------------------------------------------------
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

    return json(200, {
      status: "success",
      campaignId: insertResult.rows[0].id,
      events,
    });
  } catch (err) {
    return json(500, {
      status: "error",
      error: err?.message ?? "Unhandled server error",
      events,
    });
  }
}
