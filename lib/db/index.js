import { Pool } from "pg";

// ✅ Force Node runtime for Netlify
export const runtime = "nodejs";

// ✅ Required for Netlify + managed Postgres (Aurora, Neon, etc.)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    // Return full result, not just rows
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
