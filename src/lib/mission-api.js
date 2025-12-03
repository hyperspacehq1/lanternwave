// src/lib/mission-api.js

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
  try { json = await res.json(); } catch (_) {}

  if (!res.ok) {
    console.error("API ERROR:", path, res.status, json);
    throw new Error(`API Error: ${path}`);
  }

  return json;
}

/* ----------------------
   CAMPAIGNS (raw array)
----------------------- */
export async function listCampaigns() {
  return await apiFetch("/api-missions");  // raw array
}

/* ----------------------
   SESSIONS (raw array)
----------------------- */
export async function listSessions(campaignId) {
  return await apiFetch(`/api-mission-sessions?mission_id=${campaignId}`);
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

/* ----------------------
   PLAYERS (unwrap)
----------------------- */
export async function listSessionPlayers(sessionId) {
  const data = await apiFetch(`/api-session-players?session_id=${sessionId}`);
  return data.players || [];
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

/* ----------------------
   MESSAGES (raw array)
----------------------- */
export async function listSessionMessages(sessionId) {
  return await apiFetch(`/api-mission-messages?mission_id=${sessionId}`);
}

/* ----------------------
   NPCs (unwrap)
----------------------- */
export async function listNPCs() {
  const data = await apiFetch("/api-npcs");
  return data.npcs || [];
}

/* ----------------------
   NPC STATE
----------------------- */
export async function getNPCState(sessionId, npcId) {
  return apiFetch(`/api-npc-state?session_id=${sessionId}&npc_id=${npcId}`);
}

/* ----------------------
   EVENTS
----------------------- */
export async function archiveSessionEvent(sessionId, eventId) {
  return apiFetch(`/api-events?session_id=${sessionId}&event_id=${eventId}`, {
    method: "DELETE"
  });
}
