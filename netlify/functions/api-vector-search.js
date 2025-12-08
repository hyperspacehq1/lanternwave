// netlify/functions/api-vector-search.js
import { query } from "../util/db.js";
import OpenAI from "openai";

/* ----------------------------------------------
   Init OpenAI client (classic compatible)
---------------------------------------------- */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ----------------------------------------------
   Generate embedding for search query
---------------------------------------------- */
async function embed(text) {
  const out = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
  });

  return out.data[0].embedding;
}

/* ----------------------------------------------
   Query a table for vector similarity
---------------------------------------------- */
async function vectorQuery(table, embedding, limit = 10) {
  const res = await query(
    `
    SELECT
      id,
      search_body,
      1 - (embedding <=> $1) AS similarity,
      '${table}' AS type
    FROM ${table}
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> $1 ASC
    LIMIT $2
    `,
    [embedding, limit]
  );

  return res.rows;
}

/* ----------------------------------------------
   Helper for JSON responses
---------------------------------------------- */
function json(status, payload) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

/* ----------------------------------------------
   MAIN HANDLER — Netlify Classic (2024)
---------------------------------------------- */
export const handler = async (event, context) => {
  try {
    const qs = event.queryStringParameters || {};
    const q = qs.q;
    const table = qs.table;
    const limit = Number(qs.limit || 10);

    if (!q || q.length < 2) {
      return json(400, { error: "Query 'q' must be at least 2 characters." });
    }

    // 1. Embed query
    const embedding = await embed(q);

    // 2. Query specific table
    if (table) {
      const rows = await vectorQuery(table, embedding, limit);
      return json(200, { q, results: rows });
    }

    // 3. Query all tables
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

    let all = [];

    for (const t of tables) {
      const rows = await vectorQuery(t, embedding, limit);
      all = all.concat(rows);
    }

    // Global rank sort
    all.sort((a, b) => b.similarity - a.similarity);

    return json(200, {
      q,
      results: all.slice(0, limit),
    });
  } catch (err) {
    console.error("api-vector-search error:", err);
    return json(500, { error: err.message || "Internal Server Error" });
  }
};
