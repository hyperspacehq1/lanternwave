function buildDirectorPrompt({
  mission,
  session,
  npcs,
  messages,
  events,
  players,
}) {
  return `
Mission: ${mission?.name || ""}
Session: ${session?.session_name || ""}

Players:
${JSON.stringify(players || [], null, 2)}

NPCs:
${JSON.stringify(npcs || [], null, 2)}

Events:
${JSON.stringify(events || [], null, 2)}

Messages:
${JSON.stringify(messages || [], null, 2)}
  `;
}

module.exports = {
  buildDirectorPrompt,
};
