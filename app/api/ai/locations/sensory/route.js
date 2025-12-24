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
   POST /api/ai/locations/sensory
-------------------------------------------------- */
export async function POST(req) {
  // 0) Parse input early (so curl always gets JSON on errors)
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
    if (!tenantId) throw new Error("Missing tenantId from getTenantContext");
  } catch (e) {
    return json(500, {
      error: "Tenant context failed",
      detail: String(e?.message || e),
    });
  }

  // 2) Confirm OpenAI key
  if (!process.env.OPENAI_API_KEY) {
    return json(500, { error: "OPENAI_API_KEY is not configured" });
  }

  // 3) Dynamically import the new modular AI pieces so import-time errors become JSON
  let loadLocationContext, buildLocationSensoryPrompt, runStructuredPrompt, locationSensorySchema;

  try {
    ({ loadLocationContext } = await import(
      "@/lib/ai/loaders/loadLocationContext"
    ));
  } catch (e) {
    return json(500, {
      error: "Import failed: loadLocationContext",
      detail: String(e?.message || e),
    });
  }

  try {
    ({ buildLocationSensoryPrompt } = await import(
      "@/lib/ai/prompts/locationSensory"
    ));
  } catch (e) {
    return json(500, {
      error: "Import failed: buildLocationSensoryPrompt",
      detail: String(e?.message || e),
    });
  }

  try {
    ({ runStructuredPrompt } = await import(
      "@/lib/ai/runStructuredPrompt"
    ));
  } catch (e) {
    return json(500, {
      error: "Import failed: runStructuredPrompt",
      detail: String(e?.message || e),
    });
  }

  try {
    ({ locationSensorySchema } = await import(
      "@/lib/ai/schemas/locationSensorySchema"
    ));
  } catch (e) {
    return json(500, {
      error: "Import failed: locationSensorySchema",
      detail: String(e?.message || e),
    });
  }

  // 4) Main logic
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

    const hear = clampWords(parsed?.hear, 20);
    const smell = clampWords(parsed?.smell, 20);

    const sensory = {
      hear,
      smell,
      source: "ai",
      updated_at: new Date().toISOString(),
    };

    return json(200, { sensory });
  } catch (e) {
    return json(e?.status || 502, {
      error: e?.message || "AI request failed",
      detail: String(e?.detail || e?.stack || e),
    });
  }
}
