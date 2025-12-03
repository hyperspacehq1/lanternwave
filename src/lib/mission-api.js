// src/lib/mission-api.js
// Lanternwave API client — aligned to backend shapes (2025)

async function apiFetch(path, options = {}) {
  const res = await fetch(`/.netlify/functions${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body || null
  });

  let json = null;
  try {
    json = await res.json();
  } catch (_) {}

  if (!res.ok) {
    console.error(`API Error (${path}):`, res.status, json);
    throw new Error(`API Error (${path}): ${res.status}`);
  }

  return json;
}

/* ------------------------------------------------------------------
   CAMPAIGNS (MISSIONS)
   Backend returns: [ {...}, {...} ]
-------------------------------------------------------------------*/

export async function listCampaigns() {
  const data = await apiFetch("/api-missions");
  return Array.isArray(data) ? data : [];
}

/* ------------------------------------------------------------------
   SESSIONS
   Backend returns: [ {...}, {...} ]
-------------------------------------------------------------------*/

export async function listSessions(campaignId) {
  const data = await apiFetch(`/api-mission-sessions?mission_id=${campaignId}`);
  return Array.isArray(data) ? data : [];
}

export async function createSession({ campaign_id, session_name }) {
  return apiFetch("/api-mission-sessions", {
    method: "POST",
    body: JSON.stringify({
      mission_id: campaign_id,
      session_name
    })
  });
}

/* ------------------------------------------------------------------
   SESSION PLAYERS
   Backend returns: { players: [] }
-------------------------------------------------------------------*/

export async function listSessionPlayers(sessionId) {
  const data = await apiFetch(`/api-session-players?session_id=${sessionId}`);
  return Array.isArray(data.players) ? data.players : [];
}

export async function addSessionPlayer(sessionId, phone_number) {
  return apiFetch("/api-session-players", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, phone_number })
  });
}

export async function removeSessionPlayer(sessionId, phone_number) {
  return apiFetch(
    `/api-session-players?session_id=${sessionId}&phone_number=${phone_number}`,
    { method: "DELETE" }
  );
}

/* ------------------------------------------------------------------
   MESSAGES
   Backend returns: [ {...}, {...} ]
-------------------------------------------------------------------*/

export async function listSessionMessages(sessionId) {
  const data = await apiFetch(`/api-mission-messages?mission_id=${sessionId}`);
  return Array.isArray(data) ? data : [];
}

/* ------------------------------------------------------------------
   NPCs
   Backend returns: { npcs: [] }
-------------------------------------------------------------------*/

export async function listNPCs() {
  const data = await apiFetch("/api-npcs");
  return Array.isArray(data.npcs) ? data.npcs : [];
}

/* ------------------------------------------------------------------
   NPC STATE
-------------------------------------------------------------------*/

export async function getNPCState(sessionId, npcId) {
  return apiFetch(`/api-npc-state?session_id=${sessionId}&npc_id=${npcId}`);
}

/* ------------------------------------------------------------------
   EVENTS
-------------------------------------------------------------------*/

export async function archiveSessionEvent(sessionId, eventId) {
  return apiFetch(`/api-events?session_id=${sessionId}&event_id=${eventId}`, {
    method: "DELETE"
  });
}
