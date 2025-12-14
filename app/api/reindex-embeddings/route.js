import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/* -----------------------------------------------------------
   Tables that support embeddings (WHITELIST)
------------------------------------------------------------ */
const EMBEDDING_TABLES = [
  "campaigns",
  "sessions",
  "encounters",
  "events",
  "npcs",
  "locations",
  "items",
];

/* -----------------------------------------------------------
   POST /api/reindex-embeddings
------------------------------------------------------------ */
export async function POST(req) {
  const headers = Object.fromEntries(req.headers.entries());
  const auth = requireAdmin(headers);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const table = body.table;

    if (!EMBEDDING_TABLES.includes(table)) {
      return NextResponse.json(
        { error: "Invalid table" },
        { status: 400 }
      );
    }

    /* -------------------------------------------------------
       1. Ensure required columns exist
    -------------------------------------------------------- */
    await query(`
      ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS embedding vector(1536)
    `);

    await query(`
      ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS search_body TEXT
    `);

    await query(`
      ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS search_tsv tsvector
    `);

    /* -------------------------------------------------------
       2. Rebuild search_body + search_tsv
    -------------------------------------------------------- */
    await query(`
      UPDATE ${table}
      SET search_body = COALESCE(name, '') || ' ' || COALESCE(description, ''),
          search_tsv  = to_tsvector('english',
            COALESCE(name, '') || ' ' || COALESCE(description, '')
          )
    `);

    return NextResponse.json({
      ok: true,
      table,
      message: "Reindex completed",
    });
  } catch (err) {
    console.error("reindex-embeddings error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
