import OpenAI from "openai";
import { query } from "@/lib/db";
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

function ensureString(x) {
  if (x == null) return "";
  return String(x);
}

function buildPrompt({ campaign, location }) {
  // Only include allowed fields per spec doc:
  // campaigns: id, tenant_id, description, world_setting, campaign_date
  // locations: id, tenant_id, campaign_id, name, description, notes, world, address_*
  const addr = [
    location.address_street,
    location.address_city,
    location.address_state,
    location.address_zip,
    location.address_country,
  ]
    .filter(Boolean)
    .join(", ");

  return `
You generate sensory descriptions for tabletop campaign locations.

Return JSON ONLY matching the provided schema.
Rules:
- Always include hear and smell.
- Each must be 20 words or less.
- No extra keys. No markdown.

Campaign Context:
- Campaign description: ${ensureString(campaign.description)}
- World setting: ${ensureString(campaign.world_setting)}
- Campaign date: ${ensureString(campaign.campaign_date)}

Location Context:
- Name: ${ensureString(location.name)}
- World: ${ensureString(location.world)}
- Description: ${ensureString(location.description)}
- Notes: ${ensureString(location.notes)}
- Address: ${ensureString(addr)}
`.trim();
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
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const locationId = body.location_id ?? body.locationId ?? null;
  const expectedCampaignId = body.campaign_id ?? body.campaignId ?? null;

  if (!locationId) {
    return Response.json(
      { error: "location_id is required" },
      { status: 400 }
    );
  }

  // 1) Load location (scoped to tenant)
  const locRes = await query(
    `
    SELECT
      id,
      tenant_id,
      campaign_id,
      name,
      description,
      notes,
      world,
      address_street,
      address_city,
      address_state,
      address_zip,
      address_country
    FROM locations
    WHERE tenant_id = $1
      AND id = $2
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [tenantId, locationId]
  );

  const location = locRes.rows[0];
  if (!location) {
    return Response.json({ error: "Location not found" }, { status: 404 });
  }

  // Optional guard: ensure UI-selected campaign matches this location
  if (expectedCampaignId && location.campaign_id !== expectedCampaignId) {
    return Response.json(
      { error: "Selected campaign does not match this location" },
      { status: 400 }
    );
  }

  if (!location.campaign_id) {
    return Response.json(
      { error: "Location is missing campaign_id" },
      { status: 400 }
    );
  }

  // 2) Load campaign (scoped to tenant)
  const campRes = await query(
    `
    SELECT
      id,
      tenant_id,
      description,
      world_setting,
      campaign_date
    FROM campaigns
    WHERE tenant_id = $1
      AND id = $2
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [tenantId, location.campaign_id]
  );

  const campaign = campRes.rows[0];
  if (!campaign) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }

  // 3) Call OpenAI (Structured Outputs via json_schema)
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = buildPrompt({ campaign, location });

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a careful writing assistant. Follow the JSON schema exactly and keep each field to 20 words or fewer.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sensory",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              hear: { type: "string" },
              smell: { type: "string" },
            },
            required: ["hear", "smell"],
          },
        },
      },
      temperature: 0.7,
    });
  } catch (e) {
    return Response.json(
      { error: "OpenAI request failed", detail: String(e?.message || e) },
      { status: 502 }
    );
  }

  let parsed;
  try {
    const raw = completion?.choices?.[0]?.message?.content || "{}";
    parsed = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: "OpenAI returned invalid JSON" },
      { status: 502 }
    );
  }

  const hear = clampWords(parsed.hear, 20);
  const smell = clampWords(parsed.smell, 20);

  const sensory = {
    hear,
    smell,
    source: "ai",
    updated_at: new Date().toISOString(),
  };

  // 4) Return (client will populate textarea; saving is still explicit via existing PUT)
  return Response.json({ sensory });
}
