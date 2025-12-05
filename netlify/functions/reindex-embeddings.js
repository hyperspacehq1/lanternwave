import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TABLES = {
  campaigns: ["id", "search_body"],
  sessions: ["id", "search_body"],
  events: ["id", "search_body"],
  encounters: ["id", "search_body"],
  npcs: ["id", "search_body"],
  items: ["id", "search_body"],
  locations: ["id", "search_body"],
  lore: ["id", "search_body"],
};

/* ----------------------------------------------
   Reindex a single table
---------------------------------------------- */
async function reindexTable(table) {
  const [idCol, bodyCol] = TABLES[table];

  const rows = (
    await query(
      `SELECT ${idCol} AS id, ${bodyCol} AS body
       FROM ${table}
       WHERE ${bodyCol} IS NOT NULL
       ORDER BY id ASC`
    )
  ).rows;

  for (const row of rows) {
    if (!row.body || row.body.trim() === "") continue;

    const embedding = await generateEmbedding(row.body);

    await query(
      `
      UPDATE ${table}
      SET embedding = $2
      WHERE id = $1
      `,
      [row.id, embedding]
    );
  }

  return rows.length;
}

/* ----------------------------------------------
   OpenAI Embedding Generator
---------------------------------------------- */
async function generateEmbedding(text) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
  });

  return embedding.data[0].embedding;
}

/* ----------------------------------------------
   MAIN HANDLER — Netlify 2025
---------------------------------------------- */
export default async function handler(request: NetlifyRequest) {
  try {
    const table = request.query.get("table");

    // Reindex a single table
    if (table) {
      if (!TABLES[table]) {
        return NetlifyResponse.json(
          { error: `Unknown table '${table}'` },
          { status: 400 }
        );
      }

      const count = await reindexTable(table);
      return NetlifyResponse.json({
        status: "ok",
        table,
        updated: count,
      });
    }

    // Reindex ALL tables
    const summary = {};
    for (const t of Object.keys(TABLES)) {
      summary[t] = await reindexTable(t);
    }

    return NetlifyResponse.json({
      status: "ok",
      updated: summary,
    });
  } catch (err) {
    console.error("reindex-embeddings error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
