// netlify/functions/api-search.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import OpenAI from "openai";

/* ----------------------------------------------
   Initialize OpenAI client
---------------------------------------------- */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ----------------------------------------------
   Build a TSVECTOR full-text clause
---------------------------------------------- */
function tsv(term) {
  // safely converts "fog horn malfunction" → "fog & horn & malfunction"
  return term.trim().split(/\s+/).join(" & ");
}

/* ----------------------------------------------
   Execute full-text search across all tables
---------------------------------------------- */
async function searchAll(term) {
  const vector = tsv(term);

  const sections = {};

  sections.campaigns = (
    await query(
      `
      SELECT id, name, description, 'campaign' AS type,
             ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM campaigns
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      `,
      [vector]
    )
  ).rows;

  sections.sessions = (
    await query(
      `
      SELECT id, campaign_id, description, geography, 'session' AS type,
             ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM sessions
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      `,
      [vector]
    )
  ).rows;

  sections.events = (
    await query(
      `
      SELECT id, campaign_id, session_id, description, event_type, weather,
             priority, 'event' AS type,
             ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM events
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      `,
      [vector]
    )
  ).rows;

  sections.encounters = (
    await query(
      `
      SELECT id, campaign_id, session_id, description, notes,
             priority, 'encounter' AS type,
             ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM encounters
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      `,
      [vector]
    )
  ).rows;

  sections.npcs = (
    await query(
      `
      SELECT id, first_name, last_name, npc_type, personality, goals,
             'npc' AS type,
             ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM npcs
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      `,
      [vector]
    )
  ).rows;

  sections.items = (
    await query(
      `
      SELECT id, description, notes, 'item' AS type,
             ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM items
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      `,
      [vector]
    )
  ).rows;

  sections.locations = (
    await query(
      `
      SELECT id, description, city, state, notes,
             'location' AS type,
             ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM locations
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      `,
      [vector]
    )
  ).rows;

  sections.lore = (
    await query(
      `
      SELECT id, description, notes, 'lore' AS type,
             ts_rank(search_tsv, to_tsquery('english', $1)) AS rank
      FROM lore
      WHERE search_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      `,
      [vector]
    )
  ).rows;

  return sections;
}

/* ----------------------------------------------
   AI ranking using GPT-4.1
---------------------------------------------- */
async function aiRank(term, sections) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.1,
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: `
You are an expert GM assistant.
Your task: take structured database search results and produce:

1. A relevance-ranked list of results.
2. Group by type (campaign, session, event, encounter, npc, item, location, lore).
3. For each entry, provide:
   - Type
   - Name/Title/Short description
   - Why it is relevant to the search term
4. The output must be easy for a GM to skim.

Only rank results actually returned by the DB, never invent anything.
        `,
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
   MAIN HANDLER — Netlify 2025
---------------------------------------------- */
export default async function handler(request: NetlifyRequest) {
  try {
    const term = request.query.get("q");

    if (!term || term.trim().length < 2) {
      return NetlifyResponse.json(
        { error: "Query 'q' must be at least 2 characters." },
        { status: 400 }
      );
    }

    // 1. DB Search
    const sections = await searchAll(term);

    // 2. AI Ranking
    const ai_summary = await aiRank(term, sections);

    return NetlifyResponse.json({
      term,
      raw: sections,
      ai_summary,
    });
  } catch (err) {
    console.error("api-search error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
