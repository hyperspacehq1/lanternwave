import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/* -------------------------------
   GET /api/debug-crud/:id
-------------------------------- */
export async function GET(req, { params }) {
  const rows = await query()
    SELECT * FROM debug_crud
    WHERE id = ${params.id}::uuid
  );

  if (!rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

/* -------------------------------
   PUT /api/debug-crud/:id
-------------------------------- */
export async function PUT(req, { params }) {
  const { name } = await req.json();

  const rows = await query()
    UPDATE debug_crud
    SET name = ${name}
    WHERE id = ${params.id}::uuid
    RETURNING *
  );

  if (!rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

/* -------------------------------
   DELETE /api/debug-crud/:id
-------------------------------- */
export async function DELETE(req, { params }) {
  const rows = await query()
    DELETE FROM debug_crud
    WHERE id = ${params.id}::uuid
    RETURNING id
  );

  if (!rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
