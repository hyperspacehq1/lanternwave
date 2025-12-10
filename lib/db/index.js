// lib/db/index.js — LanternWave 2.0
// Correct Drizzle + Neon HTTP client configured for Netlify

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// ---------------------------------------------------------------------------
// 1. REQUIRED ENV VARIABLE
// ---------------------------------------------------------------------------
// Your app uses ONLY: NETLIFY_DATABASE_URL
// We throw if it is missing — prevents silent failures.
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "❌ NETLIFY_DATABASE_URL is missing. Set it in Netlify > Site Settings > Environment Variables."
  );
}

// ---------------------------------------------------------------------------
// 2. Initialize Neon HTTP client (serverless-friendly driver)
// ---------------------------------------------------------------------------
const sql = neon(DATABASE_URL);

// ---------------------------------------------------------------------------
// 3. Initialize Drizzle using STRICT schema w/ relations
// ---------------------------------------------------------------------------
// Your schema.js uses pgTable(), relations(), vectors, etc.
// Passing schema here enables type-safe Drizzle everywhere.
export const db = drizzle(sql, { schema });

// ---------------------------------------------------------------------------
// 4. Optional passthrough SQL helper (SAFE for tagged template literals)
// ---------------------------------------------------------------------------
// Use: query`SELECT * FROM campaigns WHERE id = ${id}`;
export async function query(strings, ...values) {
  return sql(strings, ...values);
}
