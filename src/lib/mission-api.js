// src/lib/mission-api.js

async function api(path, method = "GET", body = null) {
  const opts = { method, headers: {} };

  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`/.netlify/functions/${path}`, opts);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error (${path}): ${res.status} — ${text}`);
  }

  return res.json();
}

/* ============================================================
   CAMPAIGNS (MISSIONS)
   ============================================================ */

export function listMissions() {
  return api("api-missions");
}

export function createMission(name, region, summaryKnown, summaryUnknown) {
  return api("api-missions", "POST", {
    name,
    region,
    summary_known: summaryKnown || "",
    summary_unknown: summaryUnknown || ""
  });
}

/* ============================================================
   SESSIONS
   ============================================================ */

export function createSession(missionId, sessionName, gmNotes) {
  return api("api-mission-sessions", "POST", {
    mission_id: missionId,
    session_name: sessionName,
    gm_notes: gmNotes
  });
}

export function listSessionPlayers(sessionId) {
  return api(`api-mission-session?id=${sessionId}&players=1`);
}

export function addPlayerToSession(sessionId, playerName, phoneNumber) {
  return api(`api-mission-session`, "POST", {
    session_id: sessionId,
    player_name: playerName,
    phone_number: phoneNumber
  });
}

export function removePlayer(sessionId, phoneNumber) {
  return api(`api-mission-session`, "DELETE", {
    session_id: sessionId,
    phone_number: phoneNumber
  });
}

/* ============================================================
   EVENTS
   ============================================================ */

export function listSessionEvents(sessionId) {
  return api(`api-events?session_id=${sessionId}`);
}

export function createSessionEvent(sessionId, event) {
  return api("api-events", "POST", {
    session_id: sessionId,
    severity: event.severity,
    summary: event.summary,
    payload: event.payload
  });
}

export function updateSessionEvent(sessionId, eventId, event) {
  return api("api-events", "PUT", {
    session_id: sessionId,
    event_id: eventId,
    severity: event.severity,
    summary: event.summary,
    payload: event.payload
  });
}

export function archiveSessionEvent(sessionId, eventId) {
  return api("api-events", "DELETE", {
    session_id: sessionId,
    event_id: eventId
  });
}

/* ============================================================
   NPCs
   ============================================================ */

export function listNPCs() {
  return api("api-mission-npcs");
}

export function getNPCState(sessionId, npcId) {
  return api(`api-npc-state?session_id=${sessionId}&npc_id=${npcId}`);
}

/* ============================================================
   MESSAGES
   ============================================================ */

export function listSessionMessages(sessionId) {
  return api(`api-mission-messages?session_id=${sessionId}`);
}
