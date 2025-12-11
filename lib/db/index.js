import { neon } from "@neondatabase/serverless";

/**
 * Netlify 2025 DB binding:
 * Prefer NETLIFY_DATABASE_URL, fallback to DATABASE_URL for local dev.
 */
const connectionString =
  process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ No database connection string found.");
}

export const sql = neon(connectionString);

/**
 * query() — unified helper
 * Supports:
 *   1. Tagged template: query`SELECT * FROM t WHERE x = ${x}`
 *   2. Dynamic SQL: query(["UPDATE ...", a, b])
 *   3. Classic call: query("SELECT ...", [params])
 *
 * ALWAYS returns: result.rows
 */
export async function query(textOrArray, ...values) {
  // 1. Tagged template: query`SELECT * FROM t WHERE id = ${id}`
  if (Array.isArray(textOrArray) && "raw" in textOrArray) {
    let sqlText = "";
    const params = [];

    for (let i = 0; i < textOrArray.length; i++) {
      sqlText += textOrArray[i];
      if (i < values.length) {
        sqlText += `$${params.length + 1}`;
        params.push(values[i]);
      }
    }

    const result = await sql.query(sqlText, params);
    return result.rows;
  }

  // 2. Array-tag form: query([sqlText, val1, val2])
  if (Array.isArray(textOrArray) && values.length === 0) {
    const [sqlText, ...params] = textOrArray;
    const result = await sql.query(sqlText, params);
    return result.rows;
  }

  // 3. Classic call: query("SELECT ...", [params])
  const result = await sql.query(textOrArray, values[0] ?? []);
  return result.rows;
}
