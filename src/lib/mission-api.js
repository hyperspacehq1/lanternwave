// mission-api.js — FINAL, AUTHORITATIVE VERSION
// Fully synced with backend Netlify functions

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
    throw new Error(`API Error (${path}): ${res.status} — ${JSON.stringify(json)}`);
  }

  return json;
}

/* ----------------------------------------------------------
   MISSIONS
---------------------------------------------------------- */

export const listMissions = () =>
  apiFetch("/api-missions", { method: "GET" });

export const createMission = (data) =>
  apiFetch("/api-missions", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* ----------------------------------------------------------
   SESSIONS
---------------------------------------------------------- */

export const listMissionSessions = (missionId) =>
  apiFetch(`/api-mission-sessions?mission_id=${missionId}`, {
    method: "GET",
  });

export const createMissionSession = (data) =>
  apiFetch("/api-mission-sessions", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMissionSession = (sessionId) =>
  apiFetch(`/api-mission-session?session_id=${sessionId}`, {
    method: "GET",
  });

/* ----------------------------------------------------------
   EVENTS
---------------------------------------------------------- */

export const listMissionEvents = (sessionId) =>
  apiFetch(`/api-events?session_id=${sessionId}`, {
    method: "GET",
  });

export const createMissionEvent = (data) =>
  apiFetch("/api-events", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* ----------------------------------------------------------
   MESSAGES
---------------------------------------------------------- */

export const listMissionMessages = (missionId) =>
  apiFetch(`/api-mission-messages?mission_id=${missionId}`, {
    method: "GET",
  });

/* ----------------------------------------------------------
   SESSION PLAYERS
---------------------------------------------------------- */

export const listSessionPlayers = (sessionId) =>
  apiFetch(`/api-session-players?session_id=${sessionId}`, {
    method: "GET",
  });

export const addPlayerToSession = (data) =>
  apiFetch("/api-session-players", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* ----------------------------------------------------------
   NPCs (Admin-only)
---------------------------------------------------------- */

export const getAllNPCs = () =>
  apiFetch("/api-npcs", {
    method: "GET",
    headers: {
      "x-admin-key": import.meta.env.VITE_ADMIN_API_KEY,
    },
  });

export const createNPC = (data) =>
  apiFetch("/api-npcs", {
    method: "POST",
    headers: {
      "x-admin-key": import.meta.env.VITE_ADMIN_API_KEY,
    },
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
   NPC STATE
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
