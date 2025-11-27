// netlify/util/memory.js

/**
 * Extract desired memory updates from the LLM.
 * This should be called AFTER generating the NPC's reply.
 *
 * Returns a JSON object like:
 * {
 *    knowledge_updates: { crew_missing: true, anomaly: "Class-B" },
 *    flag_updates: { trust_signal: "player_shared_sensitive_info" },
 *    trust_delta: 0.1
 * }
 */
export async function extractMemoryUpdates({
  npc,
  npcState,
  playerMessage,
  npcReply,
  openaiKey
}) {
  const systemPrompt = `
You are an AI that extracts MEMORY UPDATES for an NPC in a Delta Green style game.
You NEVER generate story text. You ONLY generate structured JSON.

NPC profile:
- name: ${npc.name}
- personality_json: ${JSON.stringify(npc.personality_json)}
- truth_policy_json: ${JSON.stringify(npc.truth_policy_json)}

CURRENT MEMORY:
knowledge_json: ${JSON.stringify(npcState?.knowledge_json || {})}
flags_json: ${JSON.stringify(npcState?.flags_json || {})}
trust_level: ${npcState?.trust_level ?? 0}

TASK:
Given the player's latest message AND the NPC's reply,
determine what the NPC should logically LEARN or UPDATE in memory.

ONLY produce JSON with these fields:
{
  "knowledge_updates": { ... },
  "flag_updates": { ... },
  "trust_delta": number
}

Rules:
- Extract facts the NPC should now believe or track.
- If the player revealed new intel → add to knowledge.
- If player acts reliably → small positive trust_delta (0.05 to 0.1).
- If they lie or hide info → small negative trust_delta.
- If nothing changes → return empty objects and trust_delta = 0.
`;

  const userPrompt = `
PLAYER SAID:
"${playerMessage}"

NPC REPLIED:
"${npcReply}"
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.1 // deterministic
    })
  });

  const json = await response.json();

  try {
    return JSON.parse(json.choices[0].message.content);
  } catch (err) {
    console.error("Memory JSON parsing error:", err);
    return { knowledge_updates: {}, flag_updates: {}, trust_delta: 0 };
  }
}

/**
 * Merge new knowledge/flags into state.
 */
export function mergeMemory(oldState, updates) {
  const mergedKnowledge = {
    ...(oldState.knowledge_json || {}),
    ...(updates.knowledge_updates || {})
  };

  const mergedFlags = {
    ...(oldState.flags_json || {}),
    ...(updates.flag_updates || {})
  };

  const newTrust =
    Math.max(
      0,
      Math.min(1, (oldState.trust_level || 0) + (updates.trust_delta || 0))
    );

  return {
    knowledge_json: mergedKnowledge,
    flags_json: mergedFlags,
    trust_level: newTrust
  };
}
