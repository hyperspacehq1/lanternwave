import { getTenantContext } from "@/lib/tenant/getTenantContext";

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
   POST /api/ai/locations/sensory
-------------------------------------------------- */
export async function POST(req) {
  // 1. Parse body
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

  // 2. Resolve tenant (MANDATORY)
  let tenant;
  try {
    const ctx = await getTenantContext(req);
    tenant = ctx?.tenant;
    if (!tenant?.id) throw new Error("No tenant");
  } catch {
    return json(401, { error: "Unauthorized" });
  }

  // 3. Rate limit (tenant-scoped)
  const { rows } = await tenant.db.query(
    `
    SELECT COUNT(*)::int AS count
    FROM tenant_ai_usage
    WHERE tenant_id = $1
      AND created_at > NOW() - INTERVAL '24 hours'
    `,
    [tenant.id]
  );

  if (rows[0].count >= 50) {
    return json(429, {
      error: "AI usage limit reached",
      detail: "You have reached the 50 requests per 24 hour limit.",
    });
  }

  await tenant.db.query(
    `INSERT INTO tenant_ai_usage (tenant_id, action)
     VALUES ($1, 'sensory')`,
    [tenant.id]
  );

  // 4. Load AI helpers
  let loadLocationContext, buildLocationSensoryPrompt, runStructuredPrompt, locationSensorySchema;

  try {
    ({ loadLocationContext } = await import("@/lib/ai/loaders/loadLocationContext"));
    ({ buildLocationSensoryPrompt } = await import("@/lib/ai/prompts/locationSensory"));
    ({ runStructuredPrompt } = await import("@/lib/ai/runStructuredPrompt"));
    ({ locationSensorySchema } = await import("@/lib/ai/schemas/locationSensorySchema"));
  } catch (e) {
    return json(500, {
      error: "Failed to load AI modules",
      detail: String(e),
    });
  }

  // 5. Generate sensory content
  try {
    const { campaign, location } = await loadLocationContext({
      tenantId: tenant.id,
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

    return json(200, {
      sensory: {
        hear: clampWords(parsed?.hear, 20),
        smell: clampWords(parsed?.smell, 20),
        source: "ai",
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    return json(500, {
      error: "AI generation failed",
      detail: String(err?.message || err),
    });
  }
}
