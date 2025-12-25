// /lib/db/index.ts
export async function insertTemplateRows({
  table,
  rows,
  templateCampaignId,
  adminUserId,
}: {
  table: string;
  rows: any[];
  templateCampaignId: string | null;
  adminUserId: string;
}) {
  const inserted = [];

  for (const row of rows) {
    const result = await sql`
      INSERT INTO ${sql(table)}
      (${sql(Object.keys(row))}, template_campaign_id, created_by)
      VALUES (${sql(Object.values(row))}, ${templateCampaignId}, ${adminUserId})
      RETURNING *
    `;
    inserted.push(result.rows[0]);
  }

  return inserted;
}
