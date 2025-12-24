import { query as dbQuery } from "@/lib/db";

/**
 * Run a cross-entity full-text search.
 * Returns raw rows (already tenant-scoped).
 */
export async function runSearch({ tenantId, query, limit }) {
  const sql = `
    SELECT
      entity_type,
      id,
      campaign_id,
      label,
      rank,
      snippet
    FROM (
      SELECT 'campaigns' AS entity_type, id, id AS campaign_id, name AS label,
             ts_rank_cd(search_tsv, plainto_tsquery('english', $1)) AS rank,
             left(search_body, 160) AS snippet
      FROM campaigns
      WHERE tenant_id = $2
        AND deleted_at IS NULL
        AND search_tsv @@ plainto_tsquery('english', $1)

      UNION ALL
      SELECT 'sessions', id, campaign_id, name,
             ts_rank_cd(search_tsv, plainto_tsquery('english', $1)),
             left(search_body, 160)
      FROM sessions
      WHERE tenant_id = $2
        AND deleted_at IS NULL
        AND search_tsv @@ plainto_tsquery('english', $1)

      UNION ALL
      SELECT 'events', id, campaign_id, name,
             ts_rank_cd(search_tsv, plainto_tsquery('english', $1)),
             left(search_body, 160)
      FROM events
      WHERE tenant_id = $2
        AND deleted_at IS NULL
        AND search_tsv @@ plainto_tsquery('english', $1)

      UNION ALL
      SELECT 'locations', id, campaign_id, name,
             ts_rank_cd(search_tsv, plainto_tsquery('english', $1)),
             left(search_body, 160)
      FROM locations
      WHERE tenant_id = $2
        AND deleted_at IS NULL
        AND search_tsv @@ plainto_tsquery('english', $1)

      UNION ALL
      SELECT 'items', id, campaign_id, name,
             ts_rank_cd(search_tsv, plainto_tsquery('english', $1)),
             left(search_body, 160)
      FROM items
      WHERE tenant_id = $2
        AND deleted_at IS NULL
        AND search_tsv @@ plainto_tsquery('english', $1)

      UNION ALL
      SELECT 'encounters', id, campaign_id, name,
             ts_rank_cd(search_tsv, plainto_tsquery('english', $1)),
             left(search_body, 160)
      FROM encounters
      WHERE tenant_id = $2
        AND deleted_at IS NULL
        AND search_tsv @@ plainto_tsquery('english', $1)

      UNION ALL
      SELECT 'npcs', id, campaign_id, name,
             ts_rank_cd(search_tsv, plainto_tsquery('english', $1)),
             left(search_body, 160)
      FROM npcs
      WHERE tenant_id = $2
        AND deleted_at IS NULL
        AND search_tsv @@ plainto_tsquery('english', $1)
    ) ranked
    ORDER BY rank DESC
    LIMIT $3;
  `;

  const { rows } = await dbQuery(sql, [
    query,    // $1
    tenantId,// $2
    limit    // $3
  ]);

  return rows;
}
