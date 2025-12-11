// /lib/db/index.js
// FINAL VERSION — supports Neon HTTP + parameterized SQL everywhere

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const DATABASE_URL = process.env.NETLIFY_DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    "❌ NETLIFY_DATABASE_URL is missing. Set it in Netlify → Environment variables."
  );
}

// 1. Create Neon HTTP client (sql)
export const sql = neon(DATABASE_URL);

// 2. Create Drizzle client
export const db = drizzle(sql, { schema });

// 3. **PARAMETERIZED QUERY HELPER — ALWAYS USES sql.query()**
// This is the ONLY correct syntax for Neon HTTP when using $1 placeholders.
export async function query(text, params = []) {
  return sql.query(text, params);
}
