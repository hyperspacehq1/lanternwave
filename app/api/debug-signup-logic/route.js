import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 1,
});

export async function POST(req) {
  let client;

  try {
    const body = await req.json();
    const email = body.email || `logic_${Date.now()}@example.com`;

    client = await pool.connect();

    const result = await client.query(
      `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email
      `,
      [email, "DEBUG_NO_BCRYPT"]
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
        code: error.code,
        detail: error.detail,
      },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
