// netlify/functions/api-search.js
import OpenAI from "openai";
import { query } from "../util/db.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* Convert search term → tsquery */
function tsv(term) {
  return term.trim().split(/\s+/).join(" & ");
}

/* Run BM25 queries on all tables */
async function searchAll(term) {
  const vector = tsv(term);

  async function run(sql) {
    return (await query(sql, [vector])).rows;
  }

  return {
    campaigns: await run(`
      SELECT id, name, description, 'campaign' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM campaigns
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `),
    sessions: await run(`
      SELECT id, campaign_id, description, geography, 'session' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM sessions
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `),
    events: await run(`
      SELECT id, campaign_id, session_id, description, event_type, weather,
        priority, 'event' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM events
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `),
    encounters: await run(`
      SELECT id, campaign_id, session_id, description, notes, priority,
        'encounter' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM encounters
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `),
    npcs: await run(`
      SELECT id, first_name, last_name, npc_type, personality, goals,
        'npc' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM npcs
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `),
    items: await run(`
      SELECT id, description, notes, 'item' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM items
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `),
    locations: await run(`
      SELECT id, description, city, state, notes, 'location' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM locations
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `),
    lore: await run(`
      SELECT id, description, notes, 'lore' AS type,
        ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM lore
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 10
    `),
  };
}

/* GPT rerank */
async function aiRank(term, sections) {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      timeout: 8000,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: "Rank these RPG search results by relevance.",
        },
        {
          role: "user",
          content: JSON.stringify({ term, sections }),
        },
      ],
    });

    return completion.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("aiRank error:", err);
    return "(AI reranking unavailable)";
  }
}

/* Main handler */
export const handler = async (event) => {
  try {
    const q = event.queryStringParameters?.q || "";

    if (q.trim().length < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Query must be at least 2 characters.",
        }),
      };
    }

    const results = await searchAll(q);
    const ai_summary = await aiRank(q, results);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: q, results, ai_summary }),
    };
  } catch (err) {
    console.error("api-search error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
