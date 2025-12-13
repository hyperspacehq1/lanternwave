import { NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * Force Node runtime (NOT Edge)
 */
export const runtime = "nodejs";

/**
 * IMPORTANT:
 * - Do NOT rely on DATABASE_URL ssl params
 * - Explicit SSL config is REQUIRED for Aurora on Netlify
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // This is the critical fix for:
  // "unable to get local issuer certificate"
  ssl: {
    rejectUnauthorized: false
  },

  max: 1, // keep minimal for testing
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000
});

export async function GET() {
  let client;

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }

    client = await pool.connect();

    const result = await client.query("SELECT 1 AS ok");

    return NextResponse.json({
      status: "ok",
      db: "connected",
      result: result.rows[0],
      runtime: "nodejs",
      diagnostics: {
        hasDatabaseUrl: true,
        sslMode: "rejectUnauthorized=false",
        host: process.env.DB_HOST,
        database: process.env.DB_NAME
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
        stack: error.stack,
        diagnostics: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasDbHost: !!process.env.DB_HOST,
          hasDbUser: !!process.env.DB_USER,
          hasDbName: !!process.env.DB_NAME,
          dbSslEnv: process.env.DB_SSL,
          nodeVersion: process.version
        }
      },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
