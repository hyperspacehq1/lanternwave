import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/* -------------------------------
   GET /api/debug-crud
-------------------------------- */
export async function GET() {
  try {
    const rows = await query()
      SELECT * FROM debug_crud
      ORDER BY id DESC
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("DEBUG GET error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -------------------------------
   POST /api/debug-crud
-------------------------------- */
export async function POST(req) {
  try {
    const { name } = await req.json();

    const result = await query()
      INSERT INTO debug_crud (name)
      VALUES (${name})
      RETURNING *
    );

    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    console.error("DEBUG POST error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
