// netlify/functions/reindex-embeddings.js
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

/* -----------------------------------------------------------
   Embedding generator
------------------------------------------------------------ */
async function generateEmbedding(text) {
  const out = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
  });

  return out.data[0].embedding;
}

/* -----------------------------------------------------------
   Reindex one table
------------------------------------------------------------ */
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
    if (!row.body?.trim()) continue;

    const vector = await generateEmbedding(row.body);

    await query(
      `
      UPDATE ${table}
      SET embedding = $2
      WHERE id = $1
      `,
      [row.id, vector]
    );
  }

  return rows.length;
}

/* -----------------------------------------------------------
   MAIN HANDLER (Classic Runtime)
------------------------------------------------------------ */
export const handler = async (event, context) => {
  try {
    const qs = event.queryStringParameters || {};
    const table = qs.table;

    // Reindex 1 table
    if (table) {
      if (!TABLES[table]) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: `Unknown table '${table}'` }),
        };
      }

      const updated = await reindexTable(table);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ok", table, updated }),
      };
    }

    // Reindex ALL tables
    const summary = {};
    for (const t of Object.keys(TABLES)) {
      summary[t] = await reindexTable(t);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok", updated: summary }),
    };
  } catch (err) {
    console.error("reindex-embeddings error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
