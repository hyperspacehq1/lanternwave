async function extractMemoryUpdates(message, memoryState) {
  const payload = {
    input: message,
    memory: memoryState,
  };

  const resp = await fetch(process.env.AI_MEMORY_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  return await resp.json();
}

function mergeMemory(existing, updates) {
  return {
    ...existing,
    ...updates,
  };
}

module.exports = {
  extractMemoryUpdates,
  mergeMemory,
};
