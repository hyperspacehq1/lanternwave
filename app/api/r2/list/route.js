import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await query(
      `
      select
        id,
        object_key,
        created_at
      from clips
      order by created_at desc
      limit 20
      `
    );

    return NextResponse.json({
      ok: true,
      rows: result.rows,
    });
  } catch (err) {
    console.error("LIST DB ERROR", err);
    return NextResponse.json(
      { ok: false, error: "db failed" },
      { status: 500 }
    );
  }
}
