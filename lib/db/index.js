import { neon } from "@neondatabase/serverless";

/**
 * Use Netlify's 2025 Database binding as the primary connection string.
 * Fallback to DATABASE_URL for local development.
 */
const connectionString =
  process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ No database connection string found!");
  console.error("Expected NETLIFY_DATABASE_URL (Netlify) or DATABASE_URL (local).");
}

export const sql = neon(connectionString);

/**
 * Fully compatible query() helper
 * Supports:
 *   - query`SELECT * FROM table WHERE id = ${id}`
 *   - query(["UPDATE ...", a, b, c])
 *   - query("SELECT ...", [params])
 */
export async function query(textOrArray, ...values) {
  // Tagged template: query`SELECT * FROM t WHERE x = ${x}`
  if (Array.isArray(textOrArray) && typeof textOrArray.raw === "object") {
    let sqlText = "";
    const params = [];

    for (let i = 0; i < textOrArray.length; i++) {
      sqlText += textOrArray[i];
      if (i < values.length) {
        sqlText += `$${params.length + 1}`;
        params.push(values[i]);
      }
    }

    const result = await sql(sqlText, params);
    return result.rows;
  }

  // Array-tag dynamic: query(["UPDATE ...", val1, val2])
  if (Array.isArray(textOrArray)) {
    const [sqlText, ...params] = textOrArray;
    const result = await sql(sqlText, params);
    return result.rows;
  }

  // Standard: query("SELECT ...", [params])
  const result = await sql(textOrArray, values[0] ?? []);
  return result.rows;
}
