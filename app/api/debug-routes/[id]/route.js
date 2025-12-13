import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 1
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS debug_kv (
      id UUID PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

/**
 * PUT
 */
export async function PUT(req, context) {
  const id = context?.params?.id;

  try {
    await ensureTable();

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID in route params", params: context?.params },
        { status: 400 }
      );
    }

    const { value } = await req.json();

    // 🔍 Prove the row exists
    const existing = await pool.query(
      "SELECT id, value FROM debug_kv WHERE id = $1",
      [id]
    );

    if (existing.rowCount === 0) {
      return NextResponse.json(
        { error: "Row not found", id },
        { status: 404 }
      );
    }

    const updated = await pool.query(
      "UPDATE debug_kv SET value = $1 WHERE id = $2 RETURNING id, value",
      [value, id]
    );

    return NextResponse.json({
      status: "updated",
      row: updated.rows[0]
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}

/**
 * DELETE
 */
export async function DELETE(req, context) {
  const id = context?.params?.id;

  try {
    await ensureTable();

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID in route params", params: context?.params },
        { status: 400 }
      );
    }

    const existing = await pool.query(
      "SELECT id FROM debug_kv WHERE id = $1",
      [id]
    );

    if (existing.rowCount === 0) {
      return NextResponse.json(
        { error: "Row not found", id },
        { status: 404 }
      );
    }

    await pool.query(
      "DELETE FROM debug_kv WHERE id = $1",
      [id]
    );

    return NextResponse.json({
      status: "deleted",
      id
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
