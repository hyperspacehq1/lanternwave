import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/* -------------------------------
   GET /api/debug-crud/:id
-------------------------------- */
export async function GET(req, { params }) {
  try {
    const rows = await sql`
      SELECT * FROM debug_crud
      WHERE id = ${params.id}
    `;

    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("DEBUG GET ID error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -------------------------------
   PUT /api/debug-crud/:id
-------------------------------- */
export async function PUT(req, { params }) {
  try {
    const { name } = await req.json();

    const result = await sql`
      UPDATE debug_crud
      SET name = ${name}
      WHERE id = ${params.id}
      RETURNING *
    `;

    if (!result.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error("DEBUG PUT error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -------------------------------
   DELETE /api/debug-crud/:id
-------------------------------- */
export async function DELETE(req, { params }) {
  try {
    const result = await sql`
      DELETE FROM debug_crud
      WHERE id = ${params.id}
      RETURNING id
    `;

    if (!result.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DEBUG DELETE error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
