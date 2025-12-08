// netlify/functions/api-vector-search.js
import { query } from "../util/db.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBED_CACHE = new Map();

/* -------------------------------------------------------
   Embed with caching + fallback
------------------------------------------------------- */
async function embed(text) {
  const key = text.trim().toLowerCase();

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
    console.error("Embed error:", err);
    const fallback = Array.from({ length: 1536 }, (_, i) =>
      (key.charCodeAt(i % key.length) % 31) / 31
    );
    return fallback;
  }
}

/* -------------------------------------------------------
   Ensure table has required columns
------------------------------------------------------- */
async function ensureSearchBody(table) {
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
}

/* -------------------------------------------------------
   Run vector similarity query
------------------------------------------------------- */
async function vectorQuery(table, embedding, limit = 10) {
  await ensureSearchBody(table);

  const out = await query(
    `
    SELECT
      id,
      search_body,
      1 - (embedding <=> $1::vector) AS similarity,
      '${table}' AS type
    FROM ${table}
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $2
    `,
    [embedding, limit]
  );

  return out.rows;
}

/* -------------------------------------------------------
   Handler
------------------------------------------------------- */
export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const q = qs.q;
    const table = qs.table;
    const limit = Number(qs.limit || 10);

    if (!q || q.length < 2) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Query 'q' must be at least 2 characters." }),
      };
    }

    const embedding = await embed(q);

    if (table) {
      const results = await vectorQuery(table, embedding, limit);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, results }),
      };
    }

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

    let all = [];
    for (const t of tables) {
      const rows = await vectorQuery(t, embedding, limit);
      all.push(...rows);
    }

    all.sort((a, b) => b.similarity - a.similarity);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, results: all.slice(0, limit) }),
    };

  } catch (err) {
    console.error("api-vector-search error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
