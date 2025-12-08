// netlify/functions/ai-search.js
import { query } from "../util/db.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* -----------------------------------------------------------
   FAST BM25 / TSVECTOR SEARCH (not ILIKE)
------------------------------------------------------------ */
async function searchAllTables(term) {
  const ts = term.trim().split(/\s+/).join(" & ");

  function run(sql) {
    return query(sql, [ts]).then((r) => r.rows);
  }

  return {
    campaigns: (await run(`
      SELECT id, name, description, 'campaign' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM campaigns
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `)),
    sessions: (await run(`
      SELECT id, campaign_id, description, geography, 'session' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM sessions
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `)),
    events: (await run(`
      SELECT id, description, event_type, weather, priority, 'event' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM events
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `)),
    npcs: (await run(`
      SELECT id, first_name, last_name, npc_type, personality, goals,
        'npc' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM npcs
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `)),
    items: (await run(`
      SELECT id, description, notes, 'item' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM items
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `)),
    locations: (await run(`
      SELECT id, description, city, state, notes, 'location' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM locations
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `)),
    lore: (await run(`
      SELECT id, description, notes, 'lore' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM lore
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `)),
    encounters: (await run(`
      SELECT id, description, notes, priority, 'encounter' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM encounters
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `)),
  };
}

/* -----------------------------------------------------------
   GPT RERANKING WITH SAFETY + TIMEOUT
------------------------------------------------------------ */
async function aiRank(term, data) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      max_tokens: 600,
      timeout: 8000, // prevent 20s stalls
      messages: [
        {
          role: "system",
          content:
            "You are an AI librarian helping a Game Master. Rank results by relevance. Use concise JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({ term, db_results: data }),
        },
      ],
    });

    return completion.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("ai-search GPT error:", err);
    return "(AI summary unavailable)";
  }
}

/* -----------------------------------------------------------
   MAIN HANDLER
------------------------------------------------------------ */
export const handler = async (event) => {
  try {
    const term = event.queryStringParameters?.q || "";

    if (term.trim().length < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Query must be at least 2 characters." }),
      };
    }

    const raw = await searchAllTables(term);
    const ai_summary = await aiRank(term, raw);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term, raw, ai_summary }),
    };
  } catch (err) {
    console.error("ai-search error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
