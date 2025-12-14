import { NextResponse } from "next/server";
import { Pool } from "pg";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 1
});

async function ensureTable() {
  await pool.query()
    CREATE TABLE IF NOT EXISTS debug_kv (
      id UUID PRIMARY KEY,
      value TEXT NOT NULL
    );
  ));
}

/**
 * POST
 * Body: { "value": "test value" }
 */
export async function POST(req) {
  try {
    await ensureTable();

    const { value } = await req.json();
    if (!value) {
      return NextResponse.json({ error: "value is required" }, { status: 400 });
    }

    const id = randomUUID();

    await pool.query(
      "INSERT INTO debug_kv (id, value) VALUES ($1, $2)",
      [id, value]
    );

    return NextResponse.json({
      status: "created",
      id,
      value
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET
 * Returns all rows
 */
export async function GET() {
  try {
    await ensureTable();

    const result = await pool.query(
      "SELECT id, value FROM debug_kv ORDER BY id"
    );

    return NextResponse.json({
      count: result.rows.length,
      rows: result.rows
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
