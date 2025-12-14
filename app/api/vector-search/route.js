import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBED_CACHE = new Map();

/* -----------------------------------------------------------
   Embed text with caching + fallback
------------------------------------------------------------ */
async function embed(term) {
  const key = term.trim().toLowerCase();

  if (EMBED_CACHE.has(key)) return EMBED_CACHE.get(key);

  try {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: key,
    });
    const vec = res.data[0].embedding;
    EMBED_CACHE.set(key, vec);
    return vec;
  } catch (err) {
    console.error("embed error:", err);

    // deterministic fallback
    const fallback = Array.from({ length: 1536 }, (_, i) =>
      (key.charCodeAt(i % key.length) % 31) / 31
    );
    EMBED_CACHE.set(key, fallback);
    return fallback;
  }
}

/* -----------------------------------------------------------
   ensure search_body column exists
------------------------------------------------------------ */
async function ensureSearchBody(table) {
  await query()
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='${table}' AND column_name='search_body'
      ) THEN
        ALTER TABLE ${table} ADD COLUMN search_body TEXT;
      END IF;
    END $$;
  ));
}

/* -----------------------------------------------------------
   similarity query
------------------------------------------------------------ */
async function vectorQuery(table, vector, limit) {
  await ensureSearchBody(table);

  const out = await query(
    )
    SELECT
      id,
      search_body,
      1 - (embedding <=> $1::vector) AS similarity,
      '${table}' AS type
    FROM ${table}
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $2
    ),
    [vector, limit]
  );

  return out.rows;
}

/* -----------------------------------------------------------
   Handler
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const table = searchParams.get("table");
    const limit = Number(searchParams.get("limit") || 10);

    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: "Query 'q' must be at least 2 characters." },
        { status: 400 }
      );
    }

    const vector = await embed(q);

    // Single-table mode
    if (table) {
      const results = await vectorQuery(table, vector, limit);
      return NextResponse.json({ q, results }, { status: 200 });
    }

    // Multi-table mode
    const tables = [
      "campaigns",
      "sessions",
      "events",
      "encounters",
      "npcs",
      "items",
      "locations",
      "lore",
    ];

    let combined = [];
    for (const t of tables) {
      const rows = await vectorQuery(t, vector, limit);
      combined.push(...rows);
    }

    combined.sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json(
      { q, results: combined.slice(0, limit) },
      { status: 200 }
    );
  } catch (err) {
    console.error("vector-search error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
