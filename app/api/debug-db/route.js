import { NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * Force Node runtime (never Edge)
 */
export const runtime = "nodejs";

/**
 * HARD OVERRIDE:
 * This disables TLS CA verification at the Node process level.
 * Required for Aurora on Netlify without shipping RDS CA bundles.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * Single-use pool for debug.
 * No env conditionals. No URL ssl params. No helpers.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 1,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
});

export async function GET() {
  let client;

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing");
    }

    client = await pool.connect();

    const result = await client.query("SELECT 1 AS ok");

    return NextResponse.json({
      status: "ok",
      db: "connected",
      result: result.rows[0],
      diagnostics: {
        nodeVersion: process.version,
        tlsDisabled: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
        hasDatabaseUrl: true,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
        stack: error.stack,
        diagnostics: {
          nodeVersion: process.version,
          tlsDisabled: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasDbHost: !!process.env.DB_HOST,
          hasDbUser: !!process.env.DB_USER,
          hasDbName: !!process.env.DB_NAME,
        },
      },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
