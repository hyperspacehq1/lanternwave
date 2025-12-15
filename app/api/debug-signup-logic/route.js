import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
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
    const { email, password } = await req.json();

    const hash = await bcrypt.hash(password, 10);

    client = await pool.connect();

    const result = await client.query(
      `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email
      `,
      [email, hash]
    );

    return NextResponse.json({
      status: "ok",
      user: result.rows[0],
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
