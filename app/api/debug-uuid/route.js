import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const { name } = await req.json();

  const rows = await query()
    INSERT INTO debug_uuid (name)
    VALUES (${name})
    RETURNING *
  );

  return NextResponse.json(rows[0]);
}

export async function GET() {
  const rows = await query()
    SELECT * FROM debug_uuid
    ORDER BY id DESC
  );

  return NextResponse.json(rows);
}
