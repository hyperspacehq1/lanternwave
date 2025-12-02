// src/lib/mission-api.js
// Unified client for Lanternwave Netlify functions (2025-safe)

async function apiFetch(path, options = {}) {
  const base = "/.netlify/functions";
  const url = `${base}${path}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  options.headers = {
    ...defaultHeaders,
    ...(options.headers || {}),
  };

  const res = await fetch(url, options);
  let json = null;

  try {
    json = await res.json();
  } catch (_) {}

  if (!res.ok) {
    console.error(`API Error (${path}):`, res.status, json);
    throw new Error(
      `API Error (${path}): ${res.status} — ${JSON.stringify(json)}`
    );
  }

  return json;
}

/* ----------------------------------------------------------
   CAMPAIGNS (Renamed from Missions for UI compatibility)
---------------------------------------------------------- */

// UI expects listCampaigns()
export const listCampaigns = () =>
  apiFetch("/api-missions", { method: "GET" });

// UI expects createSession() with campaign_id
export const createSession = (data) =>
  apiFetch("/api-mission-sessions", {
    method: "POST",
    body: JSON.stringify({
      mission_id: data.campaign_id,
      session_name: data.session_name,
    }),
  });

/* ----------------------------------------------------------
   SESSIONS
---------------------------------------------------------- */

export const listSessions = (campaignId) =>
  apiFetch(`/api-mission-sessions?mission_id=${campaignId}`, {
    method: "GET",
  });

/* Original names kept too */
export const listMissionSessions = (missionId) =>
  apiFetch(`/api-mission-sessions?mission_id=${missionId}`, {
    method: "GET",
  });

export const getMissionSession = (sessionId) =>
  apiFetch(`/api-mission-session?session_id=${sessionId}`, {
    method: "GET",
  });

/* ----------------------------------------------------------
   SESSION PLAYERS
---------------------------------------------------------- */

// UI expects listSessionPlayers(sessionId)
export const listSessionPlayers = (sessionId) =>
  apiFetch(`/api-session-players?session_id=${sessionId}`, {
    method: "GET",
  });

// UI expects addSessionPlayer(sessionId, phone)
export const addSessionPlayer = (sessionId, phone_number) =>
  apiFetch("/api-session-players", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, phone_number }),
  });

// UI expects removeSessionPlayer(sessionId, phone)
export const removeSessionPlayer = (sessionId, phone_number) =>
  apiFetch(
    `/api-session-players?session_id=${sessionId}&phone_number=${phone_number}`,
    {
      method: "DELETE",
    }
  );

/* New name kept too */
export const addPlayerToSession = (data) =>
  apiFetch("/api-session-players", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* ----------------------------------------------------------
   MESSAGES
---------------------------------------------------------- */

export const listSessionMessages = (sessionId) =>
  apiFetch(`/api-mission-messages?mission_id=${sessionId}`, {
    method: "GET",
  });

/* ----------------------------------------------------------
   NPCs (global catalog)
---------------------------------------------------------- */

export const listNPCs = () =>
  apiFetch("/api-npcs", {
    method: "GET",
  });

export const getAllNPCs = () =>
  apiFetch("/api-npcs", {
    method: "GET",
    headers: { "x-admin-key": import.meta.env.VITE_ADMIN_API_KEY },
  });

export const createNPC = (data) =>
  apiFetch("/api-npcs", {
    method: "POST",
    headers: { "x-admin-key": import.meta.env.VITE_ADMIN_API_KEY },
    body: JSON.stringify(data),
  });

/* ----------------------------------------------------------
   MISSION NPC LINKING
---------------------------------------------------------- */

export const listMissionNPCs = (missionId) =>
  apiFetch(`/api-mission-npcs?mission_id=${missionId}`, {
    method: "GET",
  });

export const addNPCtoMission = (data) =>
  apiFetch("/api-mission-npcs", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* ----------------------------------------------------------
   NPC STATE (per-session)
---------------------------------------------------------- */

export const getNPCState = (sessionId, npcId) =>
  apiFetch(`/api-npc-state?session_id=${sessionId}&npc_id=${npcId}`, {
    method: "GET",
  });

export const updateNPCState = (data) =>
  apiFetch("/api-npc-state", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* ----------------------------------------------------------
   EVENTS
---------------------------------------------------------- */

export const listMissionEvents = (sessionId) =>
  apiFetch(`/api-events?session_id=${sessionId}`, {
    method: "GET",
  });

export const archiveSessionEvent = (sessionId, eventId) =>
  apiFetch(`/api-events?session_id=${sessionId}&event_id=${eventId}`, {
    method: "DELETE",
  });
