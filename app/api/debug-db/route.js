import { NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * Force Node runtime (NOT Edge)
 */
export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : false,
  max: 1,              // keep minimal for testing
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
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
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      runtime: "nodejs",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
        stack: error.stack,
        env: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasDbHost: !!process.env.DB_HOST,
          hasDbUser: !!process.env.DB_USER,
          hasDbName: !!process.env.DB_NAME,
          dbSsl: process.env.DB_SSL,
        },
      },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
