// src/lib/mission-api.js
// 2025-aligned, option A (non-breaking), matching your backend EXACTLY.

// All API calls go through here so the UI never calls fetch() directly.

async function apiFetch(path, options = {}) {
  const res = await fetch(`/.netlify/functions${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ?? null,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(
      data?.error || `API Error: ${path} → ${res.status}`
    );
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

/* ------------------------------------------------------------
   CAMPAIGNS (MISSIONS)
------------------------------------------------------------ */

export async function listCampaigns() {
  return apiFetch("/api-missions");
}

export async function createCampaign(nameOrObj) {
  const name =
    typeof nameOrObj === "string"
      ? nameOrObj.trim()
      : nameOrObj?.name?.trim();

  if (!name) throw new Error("Campaign name is required.");

  return apiFetch("/api-missions", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

/* ------------------------------------------------------------
   SESSIONS (mission_sessions)
------------------------------------------------------------ */

export async function listSessions(mission_id) {
  if (!mission_id) throw new Error("mission_id is required.");
  return apiFetch(`/api-mission-sessions?mission_id=${mission_id}`);
}

export async function createSession(mission_id, session_name) {
  if (typeof mission_id === "object") {
    session_name = mission_id.session_name;
    mission_id = mission_id.mission_id ?? mission_id.campaign_id;
  }

  if (!mission_id || !session_name?.trim()) {
    throw new Error("mission_id and session_name required.");
  }

  return apiFetch("/api-mission-sessions", {
    method: "POST",
    body: JSON.stringify({
      mission_id,
      session_name: session_name.trim(),
    }),
  });
}

/* ------------------------------------------------------------
   PLAYERS (session players)
------------------------------------------------------------ */

export async function listSessionPlayers(session_id) {
  if (!session_id) throw new Error("session_id required.");
  const data = await apiFetch(
    `/api-session-players?session_id=${session_id}`
  );
  return data.players || [];
}

export async function addSessionPlayer(session_id, player_name, phone_number) {
  if (typeof session_id === "object") {
    const obj = session_id;
    session_id = obj.session_id;
    player_name = obj.player_name;
    phone_number = obj.phone_number;
  }

  if (!session_id || !player_name || !phone_number) {
    throw new Error("session_id, player_name, phone_number required.");
  }

  return apiFetch("/api-session-players", {
    method: "POST",
    body: JSON.stringify({
      session_id,
      player_name,
      phone_number,
    }),
  });
}

export async function removeSessionPlayer(id) {
  return apiFetch(`/api-session-players?id=${id}`, {
    method: "DELETE",
  });
}

/* ------------------------------------------------------------
   MESSAGES (mission-based SMS log)
------------------------------------------------------------ */

export async function listSessionMessages(mission_id) {
  if (!mission_id) throw new Error("mission_id required.");
  return apiFetch(`/api-mission-messages?mission_id=${mission_id}`);
}

/* ------------------------------------------------------------
   EVENTS (MISSION-LEVEL EVENTS — NOT SESSION-LEVEL)
------------------------------------------------------------ */

export async function listMissionEvents(mission_id) {
  if (!mission_id) throw new Error("mission_id required.");
  const data = await apiFetch(`/api-events?mission_id=${mission_id}`);
  return data.events || [];
}

export async function createEvent(payload) {
  // Accept both: createEvent(session_id, text) and createEvent({...})
  if (typeof payload !== "object") {
    throw new Error("createEvent requires an object payload.");
  }

  if (!payload.mission_id) {
    throw new Error("mission_id required for event creation.");
  }
  if (!payload.event_type) {
    throw new Error("event_type is required.");
  }

  return apiFetch("/api-events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function archiveMissionEvent(event_id) {
  if (!event_id) throw new Error("event_id required.");
  return apiFetch(`/api-events?id=${event_id}`, {
    method: "DELETE",
  });
}

/* ------------------------------------------------------------
   NPCs (global)
------------------------------------------------------------ */

export async function listNPCs() {
  const data = await apiFetch("/api-npcs");
  return data.npcs || [];
}

export async function createNPC(npc) {
  if (!npc || typeof npc !== "object") {
    throw new Error("createNPC requires an object payload.");
  }

  const { display_name, true_name } = npc;

  if (!display_name?.trim() || !true_name?.trim()) {
    throw new Error("display_name and true_name required.");
  }

  return apiFetch("/api-npcs", {
    method: "POST",
    body: JSON.stringify(npc),
  });
}

/* ------------------------------------------------------------
   NPC ↔ Mission Assignment
------------------------------------------------------------ */

export async function assignNPCToMission({ mission_id, npc_id }) {
  if (!mission_id || !npc_id) {
    throw new Error("mission_id and npc_id required.");
  }

  return apiFetch("/api-mission-npcs", {
    method: "POST",
    body: JSON.stringify({ mission_id, npc_id }),
  });
}

/* ------------------------------------------------------------
   NPC STATE (per mission/session)
------------------------------------------------------------ */

export async function getNPCState(session_id, npc_id) {
  if (!session_id || !npc_id) {
    throw new Error("session_id and npc_id required.");
  }

  return apiFetch(
    `/api-npc-state?session_id=${session_id}&npc_id=${npc_id}`
  );
}

export async function updateNPCState({ session_id, npc_id, state }) {
  if (!session_id || !npc_id) {
    throw new Error("session_id and npc_id required.");
  }

  return apiFetch("/api-npc-state", {
    method: "POST",
    body: JSON.stringify({
      session_id,
      npc_id,
      state,
    }),
  });
}
