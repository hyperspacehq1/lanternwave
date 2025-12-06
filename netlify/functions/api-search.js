// netlify/functions/api-search.js
import OpenAI from "openai";
import { query } from "../util/db.js";

/* ----------------------------------------------
   OpenAI client
---------------------------------------------- */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ----------------------------------------------
   Convert search term to TSQUERY safely
---------------------------------------------- */
function tsv(term) {
  return term.trim().split(/\s+/).join(" & ");
}

/* ----------------------------------------------
   Perform full-text search across all entities
---------------------------------------------- */
async function searchAll(term) {
  const vector = tsv(term);

  async function run(sql) {
    return (await query(sql, [vector])).rows;
  }

  return {
    campaigns: await run(`
      SELECT id, name, description, 'campaign' AS type,
      ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM campaigns WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
    `),
    sessions: await run(`
      SELECT id, campaign_id, description, geography, 'session' AS type,
      ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM sessions WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
    `),
    events: await run(`
      SELECT id, campaign_id, session_id, description, event_type, weather,
      priority, 'event' AS type,
      ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM events WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
    `),
    encounters: await run(`
      SELECT id, campaign_id, session_id, description, notes,
      priority, 'encounter' AS type,
      ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM encounters WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
    `),
    npcs: await run(`
      SELECT id, first_name, last_name, npc_type, personality, goals,
      'npc' AS type,
      ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM npcs WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
    `),
    items: await run(`
      SELECT id, description, notes, 'item' AS type,
      ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM items WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
    `),
    locations: await run(`
      SELECT id, description, city, state, notes,
      'location' AS type,
      ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM locations WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
    `),
    lore: await run(`
      SELECT id, description, notes, 'lore' AS type,
      ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM lore WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
    `),
  };
}

/* ----------------------------------------------
   AI ranking via GPT-4.1
---------------------------------------------- */
async function aiRank(term, sections) {
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.1,
    max_tokens: 700,
    messages: [
      {
        role: "system",
        content:
          "You are a GM assistant. Rank these search results by relevance. Only use provided data.",
      },
      {
        role: "user",
        content: JSON.stringify({ term, sections }),
      },
    ],
  });

  return completion.choices[0].message.content || "";
}

/* ----------------------------------------------
   Netlify Function Handler
---------------------------------------------- */
export async function handler(event) {
  try {
    const q = event.queryStringParameters?.q || "";

    if (!q || q.trim().length < 2) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Query 'q' must be at least 2 characters." }),
      };
    }

    // DB search
    const sections = await searchAll(q);

    // AI ranking summary
    const ai_summary = await aiRank(q, sections);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        term: q,
        raw: sections,
        ai_summary,
      }),
    };
  } catch (err) {
    console.error("api-search error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
}
