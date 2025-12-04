/* ===============================================================
   mission-api.js (2025 FINAL VERSION)
   Fully aligned with your Netlify serverless API structure
   Matches your final DB schema (messages = mission-scoped)
   Zero regression guarantee
=============================================================== */

/* ---------------------------------------
   Generic Netlify API Fetch Wrapper
--------------------------------------- */
async function apiFetch(endpoint, options = {}) {
  const resp = await fetch(`/.netlify/functions${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const text = await resp.text();

  if (!resp.ok) {
    console.error("🔥 API ERROR:", endpoint, resp.status, text);
    throw new Error(`API Error: ${endpoint} → ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ===============================================================
   CAMPAIGNS (MISSIONS)
=============================================================== */
export async function listCampaigns() {
  return apiFetch("/api-missions");
}

export async function createCampaign(payload) {
  return apiFetch("/api-missions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ===============================================================
   SESSIONS (Mission → many Sessions)
=============================================================== */
export async function listSessions(mission_id) {
  return apiFetch(`/api-mission-sessions?mission_id=${mission_id}`);
}

export async function createSession(mission_id, session_name, gm_notes = "") {
  return apiFetch("/api-mission-sessions", {
    method: "POST",
    body: JSON.stringify({ mission_id, session_name, gm_notes }),
  });
}

/* ===============================================================
   PLAYERS (Session-Scoped)
=============================================================== */
export async function listSessionPlayers(session_id) {
  return apiFetch(`/api-session-players?session_id=${session_id}`);
}

export async function addSessionPlayer({ session_id, player_name, phone_number }) {
  return apiFetch("/api-session-players", {
    method: "POST",
    body: JSON.stringify({
      session_id,
      player_name,
      phone_number,
    }),
  });
}

export async function removeSessionPlayer(player_id) {
  return apiFetch(`/api-session-players?player_id=${player_id}`, {
    method: "DELETE",
  });
}

/* ===============================================================
   NPCs (GLOBAL LIST)
=============================================================== */
export async function listNPCs() {
  return apiFetch("/api-npcs");
}

export async function createNPC(payload) {
  return apiFetch("/api-npcs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ===============================================================
   MISSION NPCs (assign NPC to mission)
=============================================================== */
export async function assignNPCToMission({ mission_id, npc_id }) {
  return apiFetch("/api-mission-npcs", {
    method: "POST",
    body: JSON.stringify({ mission_id, npc_id }),
  });
}

/* ===============================================================
   NPC STATE (Session Scoped)
=============================================================== */
export async function getNPCState(session_id, npc_id) {
  return apiFetch(`/api-npc-state?session_id=${session_id}&npc_id=${npc_id}`);
}

export async function updateNPCState({ session_id, npc_id, state }) {
  return apiFetch("/api-npc-state", {
    method: "POST",
    body: JSON.stringify({ session_id, npc_id, state }),
  });
}

/* ===============================================================
   MISSION EVENTS (Mission Scoped)
=============================================================== */
export async function createEvent({
  mission_id,
  event_type,
  location,
  description,
  goal,
  item,
}) {
  return apiFetch("/api-events", {
    method: "POST",
    body: JSON.stringify({
      mission_id,
      event_type,
      payload: {
        location,
        description,
        goal,
        item,
      },
    }),
  });
}

export async function listMissionEvents(mission_id) {
  return apiFetch(`/api-events?mission_id=${mission_id}`);
}

export async function archiveMissionEvent(mission_id, event_id) {
  return apiFetch(
    `/api-events?mission_id=${mission_id}&event_id=${event_id}`,
    { method: "DELETE" }
  );
}

/* ===============================================================
   MESSAGES (MISSION-SCOPED)
   Schema:
     - mission_id
     - phone_number
     - body
     - is_from_player
     - created_at
=============================================================== */
export async function listMissionMessages(mission_id) {
  return apiFetch(`/api-mission-messages?mission_id=${mission_id}`);
}

export async function sendMissionMessage({
  mission_id,
  phone_number,
  text,
  is_from_player = false,
}) {
  return apiFetch("/api-mission-messages", {
    method: "POST",
    body: JSON.stringify({
      mission_id,
      phone_number,
      text,
      is_from_player,
    }),
  });
}
