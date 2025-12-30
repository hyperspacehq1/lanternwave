import { query } from "@/lib/db";

export async function loadLocationContext({
  tenantId,
  locationId,
  expectedCampaignId = null,
}) {
  // 1) Load location (tenant-scoped) — only allowed columns
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
    const err = new Error("Location not found");
    err.status = 404;
    throw err;
  }

  if (expectedCampaignId && location.campaign_id !== expectedCampaignId) {
    const err = new Error("Selected campaign does not match this location");
    err.status = 400;
    throw err;
  }

  if (!location.campaign_id) {
    const err = new Error("Location is missing campaign_id");
    err.status = 400;
    throw err;
  }

  // 2) Load campaign (tenant-scoped) — only allowed columns
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
    const err = new Error("Campaign not found");
    err.status = 404;
    throw err;
  }

  return { campaign, location };
}
