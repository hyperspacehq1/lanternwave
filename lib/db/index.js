import { neon } from "@neondatabase/serverless";

/**
 * Netlify 2025 Database binding first,
 * fallback to local DATABASE_URL for dev.
 */
const connectionString =
  process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ No database connection string found.");
}

export const sql = neon(connectionString);

/**
 * FINAL 2025-COMPATIBLE query() FUNCTION
 *
 * Supports:
 *   ✔ query`SELECT * FROM t WHERE id = ${id}`
 *   ✔ query("SELECT * FROM t WHERE id=$1", [id])
 *
 * IMPORTANT:
 *   - DO NOT inspect or rebuild tagged template arrays.
 *   - DO NOT modify the strings array.
 *   - DO NOT concatenate SQL manually.
 */
export async function query(textOrStrings, ...values) {
  // Case 1: Tagged template usage: query`SELECT ${id}`
  if (Array.isArray(textOrStrings) && "raw" in textOrStrings) {
    // Pass template array + values DIRECTLY to neon
    const result = await sql(textOrStrings, ...values);
    return result.rows ?? result; // Neon sometimes returns rows directly
  }

  // Case 2: Standard SQL + params
  const result = await sql.query(textOrStrings, values[0] ?? []);
  return result.rows;
}
