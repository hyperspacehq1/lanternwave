// Normalize DB → UI (date-only needed for <input type="date">)
function toDateOnly(value) {
  if (!value) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.split("T")[0];
}

// Normalize UI → DB (safe ISO conversion)
function toIso(value) {
  if (!value) return null;

  const d = new Date(value + "T00:00:00.000Z");
  if (isNaN(d.getTime())) return null;

  return d.toISOString();
}

export function toDb(json) {
  const campaignDate =
    json.campaignDate ??
    json.campaign_date ??
    null;

  return {
    name: json.name ?? null,
    description: json.description ?? null,
    world_setting:
      json.worldSetting ??
      json.world_setting ??
      null,
    campaign_date: toIso(campaignDate),
    campaign_package:
      json.campaignPackage ??
      json.campaign_package ??
      null,

    // ✅ NEW: RPG Game (optional)
    rpg_game:
      json.rpgGame ??
      json.rpg_game ??
      null,
  };
}

export function fromDb(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    worldSetting: row.world_setting,
    campaignDate: toDateOnly(row.campaign_date),
    campaignPackage: row.campaign_package,

    // ✅ NEW: RPG Game
    rpgGame: row.rpg_game ?? null,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
