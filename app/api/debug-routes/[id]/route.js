import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 1
});

function getIdFromRequest(req) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  return parts[parts.length - 1];
}

/**
 * PUT
 */
export async function PUT(req) {
  const id = getIdFromRequest(req);

  try {
    const { value } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID in URL" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "UPDATE debug_kv SET value = $1 WHERE id = $2 RETURNING id, value",
      [value, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Row not found", id },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "updated",
      row: result.rows[0]
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
export async function DELETE(req) {
  const id = getIdFromRequest(req);

  try {
    if (!id) {
      return NextResponse.json(
        { error: "Missing ID in URL" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "DELETE FROM debug_kv WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Row not found", id },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "deleted",
      id: result.rows[0].id
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
