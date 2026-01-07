import { requireAuth } from "@/lib/auth-server";

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
   POST /api/ai/locations/sensory
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

  // 🔐 Auth REQUIRED
  const session = await requireAuth();
  if (!session?.tenant) {
    return json(401, { error: "Unauthorized" });
  }

  const tenant = session.tenant;

  // Rate limit
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

  // Lazy imports (build-safe)
  const { loadLocationContext } = await import(
    "@/lib/ai/loaders/loadLocationContext"
  );
  const { buildLocationSensoryPrompt } = await import(
    "@/lib/ai/prompts/locationSensory"
  );
  const { runStructuredPrompt } = await import(
    "@/lib/ai/runStructuredPrompt"
  );
  const { locationSensorySchema } = await import(
    "@/lib/ai/schemas/locationSensorySchema"
  );

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
}
