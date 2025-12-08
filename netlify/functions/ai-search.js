// netlify/functions/ai-search.js
import { query } from "../util/db.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* -----------------------------------------------------------
   Search tables using simple ILIKE text search
------------------------------------------------------------ */
async function searchAllTables(term) {
  const like = `%${term}%`;

  function run(sql) {
    return query(sql, [like]).then((r) => r.rows);
  }

  return {
    campaigns: await run(`
      SELECT id, name, description, world_setting, 'campaign' AS type
      FROM campaigns
      WHERE name ILIKE $1 OR description ILIKE $1 OR world_setting ILIKE $1
      ORDER BY name ASC
    `),
    sessions: await run(`
      SELECT id, campaign_id, description, geography, 'session' AS type
      FROM sessions
      WHERE description ILIKE $1 OR geography ILIKE $1
    `),
    events: await run(`
      SELECT id, description, event_type, weather, priority, 'event' AS type
      FROM events
      WHERE description ILIKE $1 OR weather ILIKE $1
    `),
    npcs: await run(`
      SELECT id, first_name, last_name, npc_type, personality, goals, 'npc' AS type
      FROM npcs
      WHERE first_name ILIKE $1 OR last_name ILIKE $1
         OR personality ILIKE $1 OR goals ILIKE $1
    `),
    items: await run(`
      SELECT id, description, notes, 'item' AS type
      FROM items
      WHERE description ILIKE $1 OR notes ILIKE $1
    `),
    locations: await run(`
      SELECT id, description, city, state, notes, 'location' AS type
      FROM locations
      WHERE description ILIKE $1 OR city ILIKE $1 OR notes ILIKE $1
    `),
    lore: await run(`
      SELECT id, description, notes, 'lore' AS type
      FROM lore
      WHERE description ILIKE $1 OR notes ILIKE $1
    `),
    encounters: await run(`
      SELECT id, description, notes, priority, 'encounter' AS type
      FROM encounters
      WHERE description ILIKE $1 OR notes ILIKE $1
    `),
  };
}

/* -----------------------------------------------------------
   MAIN HANDLER (Classic Runtime)
------------------------------------------------------------ */
export const handler = async (event, context) => {
  try {
    const term = event.queryStringParameters?.q || "";
    if (!term.trim()) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing query param q" }),
      };
    }

    // 1. DB results
    const results = await searchAllTables(term);

    // 2. AI reranking
    const ai = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI librarian assisting a GM. Group and rank results by relevance. Include IDs.",
        },
        {
          role: "user",
          content: JSON.stringify({ term, db_results: results }),
        },
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    const ai_summary = ai.choices?.[0]?.message?.content || "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term, results, ai_summary }),
    };
  } catch (err) {
    console.error("ai-search error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
