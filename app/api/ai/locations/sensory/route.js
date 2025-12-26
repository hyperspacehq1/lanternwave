import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
function clampWords(s, maxWords) {
  const words = String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return String(s || "").trim();
  return words.slice(0, maxWords).join(" ");
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* -------------------------------------------------
   AI Usage Guard (50 / 24h per tenant)
-------------------------------------------------- */
async function checkAndConsumeUsage(tenantId) {
  const LIMIT = 50;

  const { rows } = await sql`
    SELECT COUNT(*)::int AS count
    FROM tenant_ai_usage
    WHERE tenant_id = ${tenantId}
      AND created_at > NOW() - INTERVAL '24 hours'
  `;

  if (rows[0].count >= LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  await sql`
    INSERT INTO tenant_ai_usage (tenant_id, action)
    VALUES (${tenantId}, 'sensory')
  `;

  return { allowed: true, remaining: LIMIT - (rows[0].count + 1) };
}

/* -------------------------------------------------
   POST /api/ai/locations/sensory
-------------------------------------------------- */
export async function POST(req) {
  // 0) Parse body
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const locationId = body.location_id ?? body.locationId ?? null;
  const expectedCampaignId = body.campaign_id ?? body.campaignId ?? null;

  if (!locationId) {
    return json(400, { error: "location_id is required" });
  }

  // 1) Tenant context
  let tenantId;
  try {
    const ctx = await getTenantContext(req);
    tenantId = ctx?.tenantId;
    if (!tenantId) throw new Error("Missing tenantId");
  } catch (e) {
    return json(500, {
      error: "Tenant context failed",
      detail: String(e?.message || e),
    });
  }

  // 2) Rate limit check
  const usage = await checkAndConsumeUsage(tenantId);
  if (!usage.allowed) {
    return json(429, {
      error: "AI usage limit reached",
      detail: "You have reached the 50 requests per 24 hour limit.",
    });
  }

  // 3) OpenAI key check
  if (!process.env.OPENAI_API_KEY) {
    return json(500, { error: "OPENAI_API_KEY is not configured" });
  }

  // 4) Dynamic imports
  let loadLocationContext, buildLocationSensoryPrompt, runStructuredPrompt, locationSensorySchema;

  try {
    ({ loadLocationContext } = await import(
      "@/lib/ai/loaders/loadLocationContext"
    ));
    ({ buildLocationSensoryPrompt } = await import(
      "@/lib/ai/prompts/locationSensory"
    ));
    ({ runStructuredPrompt } = await import(
      "@/lib/ai/runStructuredPrompt"
    ));
    ({ locationSensorySchema } = await import(
      "@/lib/ai/schemas/locationSensorySchema"
    ));
  } catch (e) {
    return json(500, {
      error: "AI module load failed",
      detail: String(e?.message || e),
    });
  }

  // 5) Generate
  try {
    const { campaign, location } = await loadLocationContext({
      tenantId,
      locationId,
      expectedCampaignId,
    });

    const prompt = buildLocationSensoryPrompt({ campaign, location });

    const parsed = await runStructuredPrompt({
      model: "gpt-4.1-mini",
      prompt,
      jsonSchema: locationSensorySchema,
      temperature: 0.7,
    });

    const sensory = {
      hear: clampWords(parsed?.hear, 20),
      smell: clampWords(parsed?.smell, 20),
      source: "ai",
      updated_at: new Date().toISOString(),
    };

    return json(200, {
      sensory,
      remaining: usage.remaining,
    });
  } catch (e) {
    return json(e?.status || 502, {
      error: e?.message || "AI generation failed",
      detail: String(e?.detail || e),
    });
  }
}
