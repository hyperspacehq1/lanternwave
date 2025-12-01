// mission-api.js
// Patched version with admin-key support for NPC endpoints

async function apiFetch(path, options = {}) {
  const base = "/.netlify/functions";
  const url = `${base}${path}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  // Merge headers (ensures admin key or others are included)
  options.headers = {
    ...defaultHeaders,
    ...(options.headers || {})
  };

  const res = await fetch(url, options);
  let out;
  try {
    out = await res.json();
  } catch (err) {
    out = null;
  }

  if (!res.ok) {
    console.error("API Error (" + path + "):", res.status, out);
    throw new Error(
      "API Error (" + path + "): " + res.status + " — " + JSON.stringify(out)
    );
  }

  return out;
}

/* ----------------------------------------------------------
   MISSIONS
---------------------------------------------------------- */

export async function listMissions() {
  return apiFetch("/api-missions", { method: "GET" });
}

export async function createMission(data) {
  return apiFetch("/api-missions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ----------------------------------------------------------
   SESSIONS
---------------------------------------------------------- */

export async function listMissionSessions(missionId) {
  return apiFetch(`/api-mission-sessions?mission_id=${missionId}`, {
    method: "GET",
  });
}

export async function createMissionSession(data) {
  return apiFetch("/api-mission-sessions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMissionSession(sessionId) {
  return apiFetch(`/api-mission-session?session_id=${sessionId}`, {
    method: "GET",
  });
}

/* ----------------------------------------------------------
   EVENTS
---------------------------------------------------------- */

export async function listMissionEvents(sessionId) {
  return apiFetch(`/api-events?session_id=${sessionId}`, {
    method: "GET",
  });
}

export async function createMissionEvent(data) {
  return apiFetch("/api-events", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ----------------------------------------------------------
   MESSAGES
---------------------------------------------------------- */

export async function listMissionMessages(missionId) {
  return apiFetch(`/api-mission-messages?mission_id=${missionId}`, {
    method: "GET",
  });
}

/* ----------------------------------------------------------
   PLAYERS
---------------------------------------------------------- */

export async function listSessionPlayers(sessionId) {
  return apiFetch(`/api-session-players?session_id=${sessionId}`, {
    method: "GET",
  });
}

export async function addPlayerToSession(data) {
  return apiFetch("/api-session-players", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ----------------------------------------------------------
   NPCs (Admin Protected Endpoints)
---------------------------------------------------------- */

// LIST ALL NPCs — Requires Admin Key
export async function getAllNPCs() {
  return apiFetch("/api-npcs", {
    method: "GET",
    headers: {
      "x-admin-key": import.meta.env.VITE_ADMIN_API_KEY
    }
  });
}

// CREATE NPC — Requires Admin Key
export async function createNPC(data) {
  return apiFetch("/api-npcs", {
    method: "POST",
    headers: {
      "x-admin-key": import.meta.env.VITE_ADMIN_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
}

/* ----------------------------------------------------------
   MISSION NPC LINKING
---------------------------------------------------------- */

export async function listMissionNPCs(missionId) {
  return apiFetch(`/api-mission-npcs?mission_id=${missionId}`, {
    method: "GET",
  });
}

export async function addNPCtoMission(data) {
  return apiFetch("/api-mission-npcs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ----------------------------------------------------------
   NPC STATE
---------------------------------------------------------- */

export async function getNPCState(sessionId, npcId) {
  return apiFetch(
    `/api-npc-state?session_id=${sessionId}&npc_id=${npcId}`,
    {
      method: "GET",
    }
  );
}

export async function updateNPCState(data) {
  return apiFetch("/api-npc-state", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
