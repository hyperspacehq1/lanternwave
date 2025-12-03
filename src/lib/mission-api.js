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
  return await apiFetch(`/api-mission-messages?session_id=${sessionId}`);
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

/* ----------------------
   CREATE EVENT
----------------------- */
export async function createEvent({ session_id, event_type, payload }) {
  return apiFetch("/api-events", {
    method: "POST",
    body: JSON.stringify({
      session_id,
      event_type,
      payload
    })
  });
}

/* ----------------------
   CREATE NPC
----------------------- */
export async function createNPC({
  display_name,
  true_name,
  primary_category,
  secondary_subtype,
  intent,
  personality_json,
  goals_text,
  secrets_text,
  tone_text,
  truth_policy_json,
  description_public,
  description_secret
}) {
  return apiFetch("/api-npcs", {
    method: "POST",
    body: JSON.stringify({
      display_name,
      true_name,
      primary_category,
      secondary_subtype,
      intent,
      personality_json,
      goals_text,
      secrets_text,
      tone_text,
      truth_policy_json,
      description_public,
      description_secret
    })
  });
}
/* ----------------------
   CREATE CAMPAIGN / MISSION
----------------------- */
export async function createCampaign({ name }) {
  return apiFetch("/api-missions", {
    method: "POST",
    body: JSON.stringify({ name })
  });
}
/* ----------------------
   ASSIGN NPC TO MISSION
----------------------- */
export async function assignNPCToMission({
  mission_id,
  npc_id,
  is_known = true,
  gm_only_notes = ""
}) {
  return apiFetch("/api-mission-npcs", {
    method: "POST",
    body: JSON.stringify({
      mission_id,
      npc_id,
      is_known,
      gm_only_notes
    })
  });
}
/* ----------------------
   UPDATE NPC STATE
----------------------- */
export async function updateNPCState({ session_id, npc_id, state }) {
  return apiFetch("/api-npc-state", {
    method: "POST",
    body: JSON.stringify({
      session_id,
      npc_id,
      state
    })
  });
}
