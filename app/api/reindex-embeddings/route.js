import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text) {
  const clean = text.trim();

  try {
    const out = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: clean,
    });
    return out.data[0].embedding;
  } catch (err) {
    console.error("embedding error:", err);

    // retry once on 429
    if (String(err).includes("429")) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const out2 = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: clean,
        });
        return out2.data[0].embedding;
      } catch (err2) {
        console.error("retry embedding failed:", err2);
      }
    }

    return Array.from({ length: 1536 }, (_, i) =>
      (clean.charCodeAt(i % clean.length) % 31) / 31
    );
  }
}

async function reindexTable(table) {
  // ensure search_body
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='${table}' AND column_name='search_body'
      ) THEN
        ALTER TABLE ${table} ADD COLUMN search_body TEXT;
      END IF;
    END $$;
  `);

  const rows = (await query(`
    SELECT id, search_body FROM ${table} ORDER BY id ASC
  `)).rows;

  let updated = 0;

  for (const row of rows) {
    if (!row.search_body?.trim()) continue;

    const emb = await generateEmbedding(row.search_body);

    await query(
      `UPDATE ${table} SET embedding=$2::vector WHERE id=$1`,
      [row.id, emb]
    );

    updated++;
  }

  return updated;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const single = searchParams.get("table");

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

    if (single) {
      if (!tables.includes(single)) {
        return NextResponse.json(
          { error: `Unknown table: ${single}` },
          { status: 400 }
        );
      }
      const count = await reindexTable(single);
      return NextResponse.json({ status: "ok", updated: { [single]: count } });
    }

    const summary = {};
    for (const t of tables) summary[t] = await reindexTable(t);

    return NextResponse.json({ status: "ok", updated: summary });
  } catch (err) {
    console.error("reindex-embeddings error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
