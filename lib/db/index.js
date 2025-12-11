
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const DATABASE_URL = process.env.NETLIFY_DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    "❌ NETLIFY_DATABASE_URL is missing. Set it in Netlify → Environment variables."
  );
}

// Supports BOTH tagged-template + parameterized query()
// Always returns rows array
export async function query(textOrArray, params) {
  // Tagged template case: query`SELECT * FROM t WHERE id = ${id}`
  if (Array.isArray(textOrArray)) {
    let sqlText = textOrArray[0];
    const values = [];

    for (let i = 1; i < textOrArray.length; i++) {
      sqlText += `$${i}`;
      values.push(textOrArray[i]);
      sqlText += textOrArray[0 + i]; // append next literal segment
    }

    const result = await sql.query(sqlText, values);
    return result.rows;
  }

  // Regular query("SELECT ...", [params])
  const result = await sql.query(textOrArray, params ?? []);
  return result.rows;
}
