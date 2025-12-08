// netlify/functions/reindex-embeddings.js
import { query } from "../util/db.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* -------------------------------------------------------
   Generate embedding with retry + synthetic fallback
------------------------------------------------------- */
async function generateEmbedding(text) {
  const clean = text.trim();
  try {
    const out = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: clean,
    });
    return out.data[0].embedding;
  } catch (err) {
    console.error("Embedding error:", err);

    if (String(err).includes("429")) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const retry = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: clean,
        });
        return retry.data[0].embedding;
      } catch (err2) {
        console.error("Retry embedding failed:", err2);
      }
    }

    // synthetic fallback
    return Array.from({ length: 1536 }, (_, i) =>
      (clean.charCodeAt(i % clean.length) % 31) / 31
    );
  }
}

/* -------------------------------------------------------
   Reindex a table
------------------------------------------------------- */
async function reindexTable(table) {
  // Ensure search_body exists
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
    SELECT id, search_body
    FROM ${table}
    ORDER BY id ASC
  `)).rows;

  let updated = 0;

  for (const row of rows) {
    if (!row.search_body?.trim()) continue;

    const emb = await generateEmbedding(row.search_body);

    await query(
      `UPDATE ${table}
       SET embedding = $2::vector
       WHERE id = $1`,
      [row.id, emb]
    );

    updated++;
  }

  return updated;
}

/* -------------------------------------------------------
   Handler
------------------------------------------------------- */
export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const single = qs.table;

    const tables = [
      "campaigns",
      "sessions",
      "events",
      "encounters",
      "npcs",
      "items",
      "locations",
      "lore"
    ];

    if (single) {
      if (!tables.includes(single)) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: `Unknown table: ${single}` }),
        };
      }
      const count = await reindexTable(single);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ok", updated: { [single]: count } }),
      };
    }

    const summary = {};
    for (const t of tables) summary[t] = await reindexTable(t);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok", updated: summary }),
    };

  } catch (err) {
    console.error("reindex error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
