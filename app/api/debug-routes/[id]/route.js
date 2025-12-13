import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 1
});

/**
 * PUT
 * Body: { "value": "updated value" }
 */
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { value } = await req.json();

    if (!value) {
      return NextResponse.json({ error: "value is required" }, { status: 400 });
    }

    const result = await pool.query(
      "UPDATE debug_kv SET value = $1 WHERE id = $2 RETURNING id, value",
      [value, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "updated",
      row: result.rows[0]
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE
 */
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    const result = await pool.query(
      "DELETE FROM debug_kv WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "deleted",
      id: result.rows[0].id
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
