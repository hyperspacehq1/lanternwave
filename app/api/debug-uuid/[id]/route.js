import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req, { params }) {
  const { name } = await req.json();

  const rows = await sql`
    UPDATE debug_uuid
    SET name = ${name}
    WHERE id = ${params.id}::uuid
    RETURNING *
  `;

  return NextResponse.json({
    matched: rows.length,
    row: rows[0] ?? null
  });
}

export async function DELETE(req, { params }) {
  const rows = await sql`
    DELETE FROM debug_uuid
    WHERE id = ${params.id}::uuid
    RETURNING id
  `;

  return NextResponse.json({
    matched: rows.length,
    id: rows[0]?.id ?? null
  });
}

