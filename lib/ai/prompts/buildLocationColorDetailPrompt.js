function ensureString(x) {
  if (x == null) return "";
  return String(x);
}

export function buildLocationColorDetailPrompt({ campaign, location }) {
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
You generate decorative environmental color detail for a 1920s-era tabletop RPG location.

Return JSON ONLY matching the provided schema:
{ "bullets": string[] }

Tone and intent:
- Early 20th-century (1910–1930) New England or transatlantic setting.
- Subtle, restrained, observational, and period-authentic.
- Decorative only; narratively irrelevant.

Rules:
- Output EXACTLY three bullet points.
- Each bullet point must be a single sentence, approximately 15–30 words.
- Focus on architecture, materials, craftsmanship, age, wear, lighting, soot, dust, acoustics, or mundane furnishings.
- Evoke age, formality, and quiet neglect through physical description only.
- No metaphors implying sentience, intent, menace, or supernatural meaning.
- Do NOT introduce characters, events, threats, secrets, or plot hooks.
- Do NOT suggest danger, mystery, or discovery.
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
