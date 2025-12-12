import { neon } from "@neondatabase/serverless";

/**
 * Netlify 2025 + Local Dev
 */
const connectionString =
  process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ No DB connection string found.");
}

export const sql = neon(connectionString);

/**
 * query() — FINAL 2025-COMPATIBLE VERSION
 * 
 * Supports:
 *   ✔ query`SELECT * FROM x WHERE id = ${id}`
 *   ✔ query("SELECT * FROM x WHERE id=$1", [id])
 *
 * DOES NOT build custom template arrays.
 * DOES NOT rewrite SQL text.
 * Delegates all parsing to Neon (required in 2025).
 */
export async function query(text, params) {
  // Tagged template form
  if (Array.isArray(text) && "raw" in text) {
    const result = await sql(text, ...(params ?? []));
    return result.rows;
  }

  // Classic SQL query
  const result = await sql.query(text, params ?? []);
  return result.rows;
}
