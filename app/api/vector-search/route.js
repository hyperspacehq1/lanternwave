import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/* -----------------------------------------------------------
   Helper: ensure search columns exist
------------------------------------------------------------ */
async function ensureSearchBody(table) {
  await query(
    `
    ALTER TABLE ${table}
    ADD COLUMN IF NOT EXISTS search_body TEXT
    `
  );

  await query(
    `
    ALTER TABLE ${table}
    ADD COLUMN IF NOT EXISTS search_tsv tsvector
    `
  );
}

export async function POST(req) {
  try {
    const { table, q } = await req.json();

    const ALLOWED = ["campaigns", "events", "encounters", "items", "quests"];
    if (!ALLOWED.includes(table)) {
      return NextResponse.json(
        { error: "invalid table" },
        { status: 400 }
      );
    }

    await ensureSearchBody(table);

    const result = await query(
      `
      SELECT *
      FROM ${table}
      WHERE search_tsv @@ plainto_tsquery('english', $1)
      ORDER BY ts_rank(search_tsv, plainto_tsquery('english', $1)) DESC
      LIMIT 20
      `,
      [q]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("vector-search error:", err);
    return NextResponse.json(
      { error: "search failed" },
      { status: 500 }
    );
  }
}
