export function toDb(json) {
  return {
    name: json.name ?? null,
    description: json.description ?? null,
    world_setting: json.worldSetting ?? null,
    campaign_date: json.campaignDate ?? null,
  };
}

export function fromDb(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    worldSetting: row.world_setting,
    campaignDate: row.campaign_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
