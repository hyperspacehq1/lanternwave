import { runSearch } from "./runSearch";

/**
 * Public search API.
 * Keeps callers decoupled from SQL implementation.
 */
export async function searchAll({
  tenantId,
  query,
  limit = 20,
}) {
  return runSearch({ tenantId, query, limit });
}
