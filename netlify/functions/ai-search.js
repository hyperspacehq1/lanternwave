// netlify/functions/ai-search.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import OpenAI from "openai";

// Initialize OpenAI 2025 client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* -----------------------------------------------------------
   Utility: run search across multiple tables
------------------------------------------------------------ */
async function searchAllTables(term) {
  const like = `%${term}%`;

  const sections = {};

  sections.campaigns = (
    await query(
      `SELECT id, name, description, world_setting, 'campaign' AS type
       FROM campaigns
       WHERE name ILIKE $1 OR description ILIKE $1 OR world_setting ILIKE $1
       ORDER BY name ASC`,
      [like]
    )
  ).rows;

  sections.sessions = (
    await query(
      `SELECT id, campaign_id, description, geography, 'session' AS type
       FROM sessions
       WHERE description ILIKE $1 OR geography ILIKE $1`,
      [like]
    )
  ).rows;

  sections.events = (
    await query(
      `SELECT id, description, event_type, weather, priority, 'event' AS type
       FROM events
       WHERE description ILIKE $1 OR weather ILIKE $1`,
      [like]
    )
  ).rows;

  sections.npcs = (
    await query(
      `SELECT id, first_name, last_name, npc_type, personality, goals, 'npc' AS type
       FROM npcs
       WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR personality ILIKE $1 OR goals ILIKE $1`,
      [like]
    )
  ).rows;

  sections.items = (
    await query(
      `SELECT id, description, notes, 'item' AS type
       FROM items
       WHERE description ILIKE $1 OR notes ILIKE $1`,
      [like]
    )
  ).rows;

  sections.locations = (
    await query(
      `SELECT id, description, city, state, notes, 'location' AS type
       FROM locations
       WHERE description ILIKE $1 OR city ILIKE $1 OR notes ILIKE $1`,
      [like]
    )
  ).rows;

  sections.lore = (
    await query(
      `SELECT id, description, notes, 'lore' AS type
       FROM lore
       WHERE description ILIKE $1 OR notes ILIKE $1`,
      [like]
    )
  ).rows;

  sections.quests = (
    await query(
      `SELECT id, description, status, 'quest' AS type
       FROM quests
       WHERE description ILIKE $1 OR status ILIKE $1`,
      [like]
    )
  ).rows;

  sections.encounters = (
    await query(
      `SELECT id, description, notes, priority, 'encounter' AS type
       FROM encounters
       WHERE description ILIKE $1 OR notes ILIKE $1`,
      [like]
    )
  ).rows;

  return sections;
}

/* -----------------------------------------------------------
   Main Handler — Netlify 2025 format
------------------------------------------------------------ */
export default async function handler(request) {
  try {
    const term = request.query.get("q") || "";
    if (!term.trim()) {
      return NetlifyResponse.json(
        { error: "Missing query param q" },
        { status: 400 }
      );
    }

    // 1. Get all results
    const results = await searchAllTables(term);

    // 2. Ask GPT to re-rank, group, and label them
    const ai = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // fast & cheap, use gpt-4.1 or gpt-o1 for deeper reasoning
      messages: [
        {
          role: "system",
          content: `
            You are an AI librarian assisting a GM.
            Task: take raw database query results and produce
            a structured, easy-to-read ranked list.

            IMPORTANT:
            - Group results by type.
            - Rank them by relevance to the search term.
            - Include short descriptions.
            - Include the record ID so the UI can navigate.
          `,
        },
        {
          role: "user",
          content: JSON.stringify({
            term,
            db_results: results,
          }),
        },
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    const answer = ai.choices?.[0]?.message?.content || "";

    return NetlifyResponse.json({
      term,
      results,
      ai_summary: answer,
    });
  } catch (err) {
    console.error("ai-search error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
