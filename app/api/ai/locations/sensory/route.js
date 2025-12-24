import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { loadLocationContext } from "@/lib/ai/loaders/loadLocationContext";
import { buildLocationSensoryPrompt } from "@/lib/ai/prompts/locationSensory";
import { runStructuredPrompt } from "@/lib/ai/runStructuredPrompt";
import { locationSensorySchema } from "@/lib/ai/schemas/locationSensorySchema";

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

function badRequest(msg) {
  return Response.json({ error: msg }, { status: 400 });
}

/* -------------------------------------------------
   POST /api/ai/locations/sensory
   body: { location_id: uuid, campaign_id?: uuid }
-------------------------------------------------- */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const locationId = body.location_id ?? body.locationId ?? null;
  const expectedCampaignId = body.campaign_id ?? body.campaignId ?? null;

  if (!locationId) return badRequest("location_id is required");

  try {
    // Load tenant-scoped campaign + location context (allowed columns only)
    const { campaign, location } = await loadLocationContext({
      tenantId,
      locationId,
      expectedCampaignId,
    });

    const prompt = buildLocationSensoryPrompt({ campaign, location });

    // 2025 standard: Responses API with JSON Schema output
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

    return Response.json({ sensory });
  } catch (e) {
    const status = e?.status || 502;
    const msg = e?.message || "AI request failed";

    // Keep details present but not overly verbose
    return Response.json(
      { error: msg, detail: e?.detail ? "see server logs" : undefined },
      { status }
    );
  }
}
