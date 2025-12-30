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

/**
 * Execute a parameterized SQL query safely.
 */
export async function query(text: string, params: any[] = []) {
  const start = Date.now();

  try {
    const result = await pool.query(text, params);

    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn(`[DB] Slow query (${duration}ms):`, text);
    }

    return result;
  } catch (err: any) {
    console.error("[DB ERROR]", {
      query: text,
      params,
      error: err?.message || err,
    });
    throw err;
  }
}

/**
 * Validates that a string is a safe SQL identifier
 * (letters, numbers, underscores; cannot start with a number)
 */
export function isSafeIdent(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

/**
 * Safely wraps an SQL identifier (table or column name).
 * Throws if the identifier is unsafe.
 */
export function ident(value: string): string {
  if (!isSafeIdent(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return `"${value}"`;
}
