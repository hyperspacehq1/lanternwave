import { Pool } from "pg";

export const runtime = "nodejs";

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
  const start = Date.now();

  try {
    const result = await pool.query(text, params);

    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn(`[DB] Slow query (${duration}ms):`, text);
    }

    return result;
  } catch (err) {
    console.error("[DB ERROR]", {
      query: text,
      params,
      error: err.message,
    });
    throw err;
  }
}
