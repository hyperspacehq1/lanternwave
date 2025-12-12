import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        id,
        id::text AS id_as_text,
        LENGTH(id::text) AS id_length,
        campaign_date,
        name,
        description
      FROM campaigns
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json({ rows }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
