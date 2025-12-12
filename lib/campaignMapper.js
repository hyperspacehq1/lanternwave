// Normalize DB → UI (date-only needed for <input type="date">)
function toDateOnly(value) {
  if (!value) return null;
  // Handles Date objects or ISO strings from Postgres
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.split("T")[0]; // "2025-12-16"
}

// Normalize UI → DB (convert "yyyy-MM-dd" into full ISO timestamp)
function toIso(value) {
  if (!value) return null;
  // User input gives "2025-12-16" → convert to full ISO
  try {
    return new Date(value + "T00:00:00.000Z").toISOString();
  } catch {
    return null;
  }
}

export function toDb(json) {
  return {
    name: json.name ?? null,
    description: json.description ?? null,
    world_setting: json.worldSetting ?? null,
    campaign_date: toIso(json.campaignDate),
  };
}

export function fromDb(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    worldSetting: row.world_setting,
    campaignDate: toDateOnly(row.campaign_date), // <-- FIXED FOR UI
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
