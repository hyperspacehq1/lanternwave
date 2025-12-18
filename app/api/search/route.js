import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function tsv(term) {
  return term.trim().split(/\s+/).join(" & ");
}

async function run(sql, args) {
  return (await query(sql, args)).rows;
}

async function searchAll(tenantId, term) {
  const vec = tsv(term);

  return {
    campaigns: await run(
      `
      SELECT id, name, description, 'campaign' AS type,
        ts_rank(search_tsv, to_tsquery('english', $2)) AS rank
      FROM campaigns
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND search_tsv @@ to_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT 10
      `,
      [tenantId, vec]
    ),

    sessions: await run(
      `
      SELECT id, campaign_id, description, geography, 'session' AS type,
        ts_rank(search_tsv, to_tsquery('english', $2)) AS rank
      FROM sessions
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND search_tsv @@ to_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT 10
      `,
      [tenantId, vec]
    ),

    events: await run(
      `
      SELECT id, campaign_id, session_id, description, event_type, weather,
        priority, 'event' AS type,
        ts_rank(search_tsv, to_tsquery('english', $2)) AS rank
      FROM events
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND search_tsv @@ to_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT 10
      `,
      [tenantId, vec]
    ),

    encounters: await run(
      `
      SELECT id, campaign_id, session_id, description, notes, priority,
        'encounter' AS type,
        ts_rank(search_tsv, to_tsquery('english', $2)) AS rank
      FROM encounters
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND search_tsv @@ to_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT 10
      `,
      [tenantId, vec]
    ),

    npcs: await run(
      `
      SELECT id, first_name, last_name, npc_type, personality, goals,
        'npc' AS type,
        ts_rank(search_tsv, to_tsquery('english', $2)) AS rank
      FROM npcs
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND search_tsv @@ to_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT 10
      `,
      [tenantId, vec]
    ),

    items: await run(
      `
      SELECT id, description, notes, 'item' AS type,
        ts_rank(search_tsv, to_tsquery('english', $2)) AS rank
      FROM items
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND search_tsv @@ to_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT 10
      `,
      [tenantId, vec]
    ),

    locations: await run(
      `
      SELECT id, description, city, state, notes, 'location' AS type,
        ts_rank(search_tsv, to_tsquery('english', $2)) AS rank
      FROM locations
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND search_tsv @@ to_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT 10
      `,
      [tenantId, vec]
    ),
  };
}

async function aiRank(term, sections) {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      max_tokens: 600,
      messages: [
        { role: "system", content: "Rank these RPG search results by relevance." },
        { role: "user", content: JSON.stringify({ term, sections }) },
      ],
    });

    return completion.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("aiRank error:", err);
    return "(AI reranking unavailable)";
  }
}

/* -----------------------------------------------------------
   GET /api/search?q=
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return Response.json(
      { error: "Query must be at least 2 characters." },
      { status: 400 }
    );
  }

  const results = await searchAll(tenantId, q);
  const ai_summary = await aiRank(q, results);

  return Response.json({ term: q, results, ai_summary });
}
