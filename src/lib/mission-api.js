/* mission-api.js (FINAL FULL VERSION)
   Fully aligned with all /api-* serverless functions
   Netlify 2025 compatible
*/

/* ------------------------------
   Generic Netlify Fetch Wrapper
------------------------------ */
async function apiFetch(endpoint, options = {}) {
  const resp = await fetch(`/.netlify/functions${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!resp.ok) {
    let text = await resp.text();
    console.error("API ERROR:", endpoint, resp.status, text);
    throw new Error(`API Error: ${endpoint}`);
  }

  return resp.json();
}

/* ============================================
   CAMPAIGNS
============================================ */
export async function listCampaigns() {
  return apiFetch("/api-missions");
}

export async function createCampaign(payload) {
  return apiFetch("/api-missions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ============================================
   SESSIONS
============================================ */
export async function listSessions(mission_id) {
  return apiFetch(`/api-mission-sessions?mission_id=${mission_id}`);
}

export async function createSession(mission_id, session_name) {
  return apiFetch("/api-mission-sessions", {
    method: "POST",
    body: JSON.stringify({ mission_id, session_name }),
  });
}

/* ============================================
   PLAYERS
============================================ */
export async function listSessionPlayers(session_id) {
  return apiFetch(`/api-session-players?session_id=${session_id}`);
}

export async function addSessionPlayer({ session_id, phone_number, player_name }) {
  return apiFetch("/api-session-players", {
    method: "POST",
    body: JSON.stringify({
      session_id,
      phone_number,
      player_name,
    }),
  });
}

export async function removeSessionPlayer(session_id, phone_number) {
  return apiFetch(
    `/api-session-players?session_id=${session_id}&phone_number=${phone_number}`,
    { method: "DELETE" }
  );
}

/* ============================================
   NPCs (GLOBAL)
============================================ */
export async function listNPCs() {
  return apiFetch("/api-npcs");
}

export async function createNPC(payload) {
  return apiFetch("/api-npcs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ============================================
   MISSION NPCs
============================================ */
export async function assignNPCToMission({ mission_id, npc_id }) {
  return apiFetch("/api-mission-npcs", {
    method: "POST",
    body: JSON.stringify({ mission_id, npc_id }),
  });
}

/* ============================================
   NPC STATE (SESSION-SCOPED)
============================================ */
export async function getNPCState(session_id, npc_id) {
  return apiFetch(`/api-npc-state?session_id=${session_id}&npc_id=${npc_id}`);
}

export async function updateNPCState({ session_id, npc_id, state }) {
  return apiFetch("/api-npc-state", {
    method: "POST",
    body: JSON.stringify({ session_id, npc_id, state }),
  });
}

/* ============================================
   MISSION EVENTS (MATCHES YOUR FILE)
============================================ */
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
