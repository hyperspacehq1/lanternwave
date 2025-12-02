// netlify/util/memory.js

export async function extractMemoryUpdates(message, memoryState) {
  const payload = {
    input: message,
    memory: memoryState,
  };

  const resp = await fetch(process.env.AI_MEMORY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    throw new Error(`AI_MEMORY_URL HTTP ${resp.status}`);
  }

  return await resp.json();
}

export function mergeMemory(existing, updates) {
  return {
    ...existing,
    ...updates,
  };
}
