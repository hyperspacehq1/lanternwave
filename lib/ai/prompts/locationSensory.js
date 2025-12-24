function ensureString(x) {
  if (x == null) return "";
  return String(x);
}

export function buildLocationSensoryPrompt({ campaign, location }) {
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
You generate sensory descriptions for tabletop RPG campaign locations.

Return JSON ONLY matching the provided schema:
{ "hear": string, "smell": string }

Rules:
- Always include "hear" and "smell".
- Each field must be 20 words or less.
- No extra keys. No markdown. No commentary.

Campaign Context:
- Description: ${ensureString(campaign.description)}
- World Setting: ${ensureString(campaign.world_setting)}
- Campaign Date: ${ensureString(campaign.campaign_date)}

Location Context:
- Name: ${ensureString(location.name)}
- World: ${ensureString(location.world)}
- Description: ${ensureString(location.description)}
- Notes: ${ensureString(location.notes)}
- Address: ${ensureString(addr)}
`.trim();
}
