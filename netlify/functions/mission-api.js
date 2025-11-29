// src/lib/mission-api.js
// CENTRALIZED API CLIENT FOR ALL MISSION MANAGER CALLS
// Uses your existing Netlify Functions and Admin-Key security

const API_BASE = "/.netlify/functions";

// ---------------------------------------------------------------------
// Helper Wrapper for Admin-Key Authenticated Requests
// ---------------------------------------------------------------------
async function fetchWithAdminKey(endpoint, method = "GET", body = null) {
  const headers = {
    "Content-Type": "application/json",
    "X-Admin-Key": import.meta.env.VITE_ADMIN_KEY || "",
  };

  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[API ERROR]", endpoint, res.status, txt);
    throw new Error(`API Error: ${res.status}`);
  }

  return await res.json();
}

// =====================================================================
// MISSIONS
// =====================================================================
export async function listMissions() {
  return fetchWithAdminKey(`api-missions`);
}

export async function getMission(missionId) {
  return fetchWithAdminKey(`api-missions?id=${missionId}`);
}

// =====================================================================
// SESSIONS
// =====================================================================
export async function listSessions() {
  return fetchWithAdminKey("api-mission-sessions");
}

export async function createSession({ mission_id, session_name, gm_notes }) {
  return fetchWithAdminKey("api-mission-sessions", "POST", {
    mission_id,
    session_name,
    gm_notes,
  });
}

export async function getSession(sessionId) {
  return fetchWithAdminKey(`api-mission-session?id=${sessionId}`);
}

export async function updateSession(sessionId, updates) {
  return fetchWithAdminKey("api-mission-session", "PUT", {
    id: sessionId,
    ...updates,
  });
}

export async function resetSession(sessionId) {
  return fetchWithAdminKey("api-mission-session", "DELETE", {
    id: sessionId,
  });
}

// =====================================================================
// PLAYERS (session_players)
// =====================================================================
export async function listSessionPlayers(sessionId) {
  return fetchWithAdminKey(
    `api-mission-messages?action=listPlayers&session_id=${sessionId}`
  );
}

export async function addPlayerToSession(sessionId, playerName, phoneNumber) {
  return fetchWithAdminKey("api-mission-messages", "POST", {
    action: "addPlayer",
    session_id: sessionId,
    player_name: playerName,
    phone_number: phoneNumber,
  });
}

export async function removePlayer(playerId) {
  return fetchWithAdminKey("api-mission-messages", "DELETE", { id: playerId });
}

// =====================================================================
// MESSAGES / LOGS
// =====================================================================
export async function listSessionMessages(sessionId) {
  return fetchWithAdminKey(
    `api-mission-messages?action=listMessages&session_id=${sessionId}`
  );
}

// =====================================================================
// NPCs (mission_npcs)
// =====================================================================
export async function listNPCsForMission(missionId) {
  return fetchWithAdminKey(`api-mission-npcs?mission_id=${missionId}`);
}

// =====================================================================
// NPC State (npc_state)
// =====================================================================
export async function getNPCState(sessionId, npcId, phoneNumber = null) {
  let url = `api-npc-state?session_id=${sessionId}&npc_id=${npcId}`;
  if (phoneNumber) url += `&phone_number=${phoneNumber}`;
  return fetchWithAdminKey(url);
}

// =====================================================================
// EVENTS — NEW (mission_events)
// =====================================================================
export async function listSessionEvents(sessionId) {
  return fetchWithAdminKey(`api-events?session_id=${sessionId}`);
}

export async function createSessionEvent({
  session_id,
  event_type,
  phone_number,
  summary,
  details,
  severity,
}) {
  return fetchWithAdminKey("api-events", "POST", {
    session_id,
    event_type,
    phone_number,
    summary,
    details,
    severity,
  });
}

export async function updateSessionEvent({
  id,
  event_type,
  phone_number,
  summary,
  details,
  severity,
}) {
  return fetchWithAdminKey("api-events", "PUT", {
    id,
    event_type,
    phone_number,
    summary,
    details,
    severity,
  });
}

export async function archiveSessionEvent(eventId) {
  return fetchWithAdminKey("api-events", "DELETE", {
    id: eventId,
  });
}

