import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

// Netlify + managed Postgres safety
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 1,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
});

export async function POST() {
  let client;

  try {
    client = await pool.connect();

    const email = `debug_${Date.now()}@example.com`;

    const result = await client.query(
      `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email
      `,
      [email, "DEBUG_HASH"]
    );

    return NextResponse.json({
      ok: true,
      user: result.rows[0],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message,
        code: error.code || null,
      },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
