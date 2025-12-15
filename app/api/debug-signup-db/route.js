import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

export async function POST() {
  try {
    const client = await pool.connect();

    const email = `debug_${Date.now()}@example.com`;

    const res = await client.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, "DEBUG_HASH"]
    );

    client.release();

    return NextResponse.json({ ok: true, user: res.rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}

