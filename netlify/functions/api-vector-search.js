// netlify/functions/api-vector-search.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ----------------------------------------------
   Generate embedding for search query
---------------------------------------------- */
async function embed(text) {
  const e = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
  });

  return e.data[0].embedding;
}

/* ----------------------------------------------
   Query a table for vector similarity
---------------------------------------------- */
async function vectorQuery(table, embedding, limit = 10) {
  return (
    await query(
      `
      SELECT id,
             search_body,
             1 - (embedding <=> $1) AS similarity,
             '${table}' AS type
      FROM ${table}
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1 ASC
      LIMIT $2
      `,
      [embedding, limit]
    )
  ).rows;
}

/* ----------------------------------------------
   MAIN HANDLER — Netlify 2025
---------------------------------------------- */
export default async function handler(request: NetlifyRequest) {
  try {
    const q = request.query.get("q");
    const table = request.query.get("table");
    const limit = Number(request.query.get("limit") || 10);

    if (!q || q.length < 2) {
      return NetlifyResponse.json(
        { error: "Query 'q' must be at least 2 characters." },
        { status: 400 }
      );
    }

    // 1. Embed the query text
    const embedding = await embed(q);

    // 2. Query one table
    if (table) {
      const rows = await vectorQuery(table, embedding, limit);
      return NetlifyResponse.json({ q, results: rows });
    }

    // 3. Query ALL tables
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

    // sort globally by similarity score
    all.sort((a, b) => b.similarity - a.similarity);

    return NetlifyResponse.json({
      q,
      results: all.slice(0, limit),
    });
  } catch (err) {
    console.error("api-vector-search error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
