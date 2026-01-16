import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
function clampWords(s, maxWords) {
  const words = String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.length <= maxWords
    ? words.join(" ")
    : words.slice(0, maxWords).join(" ");
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* -------------------------------------------------
   POST /api/ai/locations/color-detail
-------------------------------------------------- */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const locationId = body.location_id ?? body.locationId;
  const expectedCampaignId = body.campaign_id ?? body.campaignId;

  if (!locationId) {
    return json(400, { error: "location_id is required" });
  }

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
  // Rate limit (per tenant, 24h window)
  // -------------------------------------------------
  const { rows } = await query(
    `
    SELECT COUNT(*)::int AS count
    FROM tenant_ai_usage
    WHERE tenant_id = $1
      AND created_at > NOW() - INTERVAL '24 hours'
    `,
    [tenantId]
  );

  if (rows[0].count >= 50) {
    return json(429, {
      error: "AI usage limit reached",
      detail: "You have reached the 50 requests per 24 hour limit.",
    });
  }

  await query(
    `
    INSERT INTO tenant_ai_usage (tenant_id, action)
    VALUES ($1, 'color_detail')
    `,
    [tenantId]
  );

  // -------------------------------------------------
  // Lazy AI imports (build-safe)
  // -------------------------------------------------
  const { loadLocationContext } = await import(
    "@/lib/ai/loaders/loadLocationContext"
  );
  const { buildLocationColorDetailPrompt } = await import(
    "@/lib/ai/prompts/locationColorDetail"
  );
  const { runStructuredPrompt } = await import(
    "@/lib/ai/runStructuredPrompt"
  );
  const { locationColorDetailSchema } = await import(
    "@/lib/ai/schemas/locationColorDetailSchema"
  );

  const { campaign, location } = await loadLocationContext({
    tenantId,
    locationId,
    expectedCampaignId,
  });

  const prompt = buildLocationColorDetailPrompt({ campaign, location });

  const parsed = await runStructuredPrompt({
    model: "gpt-4.1-mini",
    prompt,
    jsonSchema: locationColorDetailSchema,
    temperature: 0.6,
  });

  return json(200, {
    color_detail: {
      bullets: Array.isArray(parsed?.bullets)
        ? parsed.bullets.map((b) => clampWords(b, 30))
        : [],
      source: "ai",
      updated_at: new Date().toISOString(),
    },
  });
}
