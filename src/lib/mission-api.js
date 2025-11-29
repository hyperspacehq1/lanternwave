// =====================================================
// mission-api.js — FULLY PATCHED VERSION
// Matches all MissionManagerPage.jsx imports
// =====================================================

async function api(path, options = {}) {
  const res = await fetch(`/.netlify/functions/${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }
  return res.json();
}

// ----------------------------------------------
// SESSIONS
// ----------------------------------------------

export function listSessions() {
  return api("api-mission-sessions");
}

export function createSession(missionId, sessionName, gmNotes) {
  return api("api-mission-sessions", {
    method: "POST",
    body: { mission_id: missionId, session_name: sessionName, gm_notes: gmNotes },
  });
}

// ----------------------------------------------
// PLAYERS (add/remove/list)
// ----------------------------------------------

export function listSessionPlayers(sessionId) {
  return api(`api-mission-session?session_id=${sessionId}&players=1`);
}

export function addPlayerToSession(sessionId, playerName, phoneNumber) {
  return api("api-mission-session", {
    method: "POST",
    body: {
      action: "add_player",
      session_id: sessionId,
      player_name: playerName,
      phone_number: phoneNumber,
    },
  });
}

export function removePlayer(playerRecordId) {
  return api("api-mission-session", {
    method: "POST",
    body: {
      action: "remove_player",
      player_id: playerRecordId,
    },
  });
}

// ----------------------------------------------
// EVENTS
// ----------------------------------------------

export function listSessionEvents(sessionId) {
  return api(`api-events?session_id=${sessionId}`);
}

export function createSessionEvent(eventData) {
  return api("api-events", {
    method: "POST",
    body: { action: "create", ...eventData },
  });
}

export function updateSessionEvent(eventData) {
  return api("api-events", {
    method: "POST",
    body: { action: "update", ...eventData },
  });
}

export function archiveSessionEvent(eventId) {
  return api("api-events", {
    method: "POST",
    body: { action: "archive", id: eventId },
  });
}

// ----------------------------------------------
// LOGS / MESSAGES
// ----------------------------------------------

export function listSessionMessages(sessionId) {
  return api(`api-mission-messages?session_id=${sessionId}`);
}

// ----------------------------------------------
// NPC STATE
// ----------------------------------------------

export function getNPCState(sessionId, npcId) {
  return api(`api-npc-state?session_id=${sessionId}&npc_id=${npcId}`);
}
