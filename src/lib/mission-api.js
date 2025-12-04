// src/lib/mission-api.js
// Front-end helper for all Netlify serverless APIs.
// Option A: Keep existing API structure, just modernize and align
// with MissionManagerPage.jsx and 2025 Netlify/Vite bundling.

/* ----------------------------------------
   LOW-LEVEL FETCH WRAPPER
---------------------------------------- */

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
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data?.error
        ? data.error
        : `API Error: ${path} → ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

/* ----------------------------------------
   CAMPAIGNS (missions)
---------------------------------------- */

export async function listCampaigns() {
  // api-missions.js returns a raw array of missions
  return apiFetch("/api-missions");
}

/**
 * createCampaign
 * Accepts either:
 *  - createCampaign("My Campaign")
 *  - createCampaign({ name: "My Campaign" })
 */
export async function createCampaign(arg) {
  const name =
    typeof arg === "string"
      ? arg
      : arg && typeof arg === "object"
      ? arg.name
      : null;

  if (!name || !name.trim()) {
    throw new Error("Campaign name is required");
  }

  return apiFetch("/api-missions", {
    method: "POST",
    body: JSON.stringify({ name: name.trim() }),
  });
}

/* ----------------------------------------
   SESSIONS (mission_sessions)
---------------------------------------- */

export async function listSessions(campaignId) {
  if (!campaignId) throw new Error("campaignId / mission_id is required");
  return apiFetch(
    `/api-mission-sessions?mission_id=${encodeURIComponent(campaignId)}`
  );
}

/**
 * createSession
 * Accepts either:
 *  - createSession(campaignId, "Session Name")
 *  - createSession({ campaign_id, session_name })
 *  - createSession({ mission_id, session_name })
 */
export async function createSession(arg1, arg2) {
  let mission_id;
  let session_name;

  if (typeof arg1 === "object" && arg1 !== null) {
    mission_id = arg1.mission_id ?? arg1.campaign_id;
    session_name = arg1.session_name;
  } else {
    mission_id = arg1;
    session_name = arg2;
  }

  if (!mission_id || !session_name || !String(session_name).trim()) {
    throw new Error("mission_id and session_name are required");
  }

  return apiFetch("/api-mission-sessions", {
    method: "POST",
    body: JSON.stringify({
      mission_id,
      session_name: String(session_name).trim(),
    }),
  });
}

/* ----------------------------------------
   PLAYERS (session_players)
---------------------------------------- */

/**
 * listSessionPlayers(sessionId)
 * api-session-players.js returns: { players: [...] }
 */
export async function listSessionPlayers(sessionId) {
  if (!sessionId) throw new Error("sessionId is required");
  const data = await apiFetch(
    `/api-session-players?session_id=${encodeURIComponent(sessionId)}`
  );
  return data.players || [];
}

/**
 * addSessionPlayer
 * Accepts either:
 *  - addSessionPlayer(sessionId, playerName, phoneNumber)
 *  - addSessionPlayer({ session_id, player_name, phone_number })
 *
 * NOTE: Backend currently only implements GET; POST will 405
 * until api-session-players.js is extended. We keep this here
 * because the UI already calls it and you plan to extend backend.
 */
export async function addSessionPlayer(arg1, arg2, arg3) {
  let session_id, player_name, phone_number;

  if (typeof arg1 === "object" && arg1 !== null) {
    ({ session_id, player_name, phone_number } = arg1);
  } else {
    session_id = arg1;
    player_name = arg2;
    phone_number = arg3;
  }

  if (!session_id || !player_name || !phone_number) {
    throw new Error("session_id, player_name, and phone_number are required");
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

/**
 * removeSessionPlayer(playerRowId)
 * (Assumes you will add DELETE support to api-session-players.js)
 */
export async function removeSessionPlayer(playerId) {
  if (!playerId) throw new Error("playerId is required");
  return apiFetch(`/api-session-players?id=${encodeURIComponent(playerId)}`, {
    method: "DELETE",
  });
}

/* ----------------------------------------
   MESSAGES (mission-messages / SMS log)
---------------------------------------- */

/**
 * listSessionMessages(missionId)
 *
 * api-mission-messages.js expects mission_id, not session_id.
 * Call this with selectedSession.mission_id from the UI.
 */
export async function listSessionMessages(missionId) {
  if (!missionId) throw new Error("missionId is required");
  return apiFetch(
    `/api-mission-messages?mission_id=${encodeURIComponent(missionId)}`
  );
}

/* ----------------------------------------
   EVENTS (session events / timeline)
---------------------------------------- */

/**
 * listEvents(sessionId)
 * api-events.js expects session_id in query string.
 */
export async function listEvents(sessionId) {
  if (!sessionId) throw new Error("sessionId is required");
  return apiFetch(`/api-events?session_id=${encodeURIComponent(sessionId)}`);
}

/**
 * createEvent
 * Minimal, safe version that matches api-events.js:
 *   - session_id (required)
 *   - body       (required, text)
 *
 * You can decorate body with type/location/goal/item in the UI
 * and still store it in the single "body" column as you do now.
 *
 * Accepts:
 *  - createEvent(sessionId, bodyText)
 *  - createEvent({ session_id, body })
 */
export async function createEvent(arg1, arg2) {
  let session_id;
  let body;

  if (typeof arg1 === "object" && arg1 !== null) {
    session_id = arg1.session_id;
    body = arg1.body;
  } else {
    session_id = arg1;
    body = arg2;
  }

  if (!session_id || !body || !String(body).trim()) {
    throw new Error("session_id and body are required");
  }

  return apiFetch("/api-events", {
    method: "POST",
    body: JSON.stringify({
      session_id,
      body: String(body).trim(),
    }),
  });
}

/**
 * archiveSessionEvent(sessionId, eventId)
 * api-events.js currently does not implement DELETE; this is wired
 * for when/if you add that support on backend.
 */
export async function archiveSessionEvent(sessionId, eventId) {
  if (!sessionId || !eventId) {
    throw new Error("sessionId and eventId are required");
  }
  return apiFetch(
    `/api-events?session_id=${encodeURIComponent(
      sessionId
    )}&event_id=${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
    }
  );
}

/* ----------------------------------------
   NPCs (global)
---------------------------------------- */

/**
 * listNPCs()
 * api-npcs.js (GET) returns: { npcs: [...] }
 */
export async function listNPCs() {
  const data = await apiFetch("/api-npcs");
  return data.npcs || [];
}

/**
 * createNPC
 * Aligns with your upgraded api-npcs.js and NPC DB schema.
 *
 * Accepts a single object with keys:
 *  - display_name (required)
 *  - true_name    (required)
 *  - primary_category (required; default "Unspecified")
 *  - secondary_subtype
 *  - intent
 *  - personality_json
 *  - goals_text
 *  - secrets_text
 *  - tone_text
 *  - truth_policy_json
 *  - description_public
 *  - description_secret
 *  - notes
 */
export async function createNPC(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("createNPC requires an object payload");
  }

  const {
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
    description_secret,
    notes,
  } = payload;

  if (!display_name || !true_name) {
    throw new Error("display_name and true_name are required");
  }

  const body = {
    display_name,
    true_name,
    primary_category: primary_category || "Unspecified",
    secondary_subtype: secondary_subtype ?? null,
    intent: intent ?? null,
    personality_json: personality_json ?? {},
    goals_text: goals_text ?? null,
    secrets_text: secrets_text ?? null,
    tone_text: tone_text ?? null,
    truth_policy_json: truth_policy_json ?? {},
    description_public: description_public ?? null,
    description_secret: description_secret ?? null,
    notes: notes ?? null,
  };

  return apiFetch("/api-npcs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ----------------------------------------
   NPC ↔ MISSION assignment
---------------------------------------- */

/**
 * assignNPCToMission({ mission_id, npc_id })
 * Uses api-mission-npcs.js (POST).
 */
export async function assignNPCToMission({ mission_id, npc_id }) {
  if (!mission_id || !npc_id) {
    throw new Error("mission_id and npc_id are required");
  }
  return apiFetch("/api-mission-npcs", {
    method: "POST",
    body: JSON.stringify({ mission_id, npc_id }),
  });
}

/* ----------------------------------------
   NPC STATE (per-session attitudes, flags)
---------------------------------------- */

/**
 * getNPCState(sessionId, npcId)
 * api-npc-state.js (GET) expects session_id & npc_id in query.
 */
export async function getNPCState(sessionId, npcId) {
  if (!sessionId || !npcId) {
    throw new Error("sessionId and npcId are required");
  }
  return apiFetch(
    `/api-npc-state?session_id=${encodeURIComponent(
      sessionId
    )}&npc_id=${encodeURIComponent(npcId)}`
  );
}

/**
 * updateNPCState({ session_id, npc_id, state })
 * api-npc-state.js (POST) writes or updates a row.
 */
export async function updateNPCState({ session_id, npc_id, state }) {
  if (!session_id || !npc_id) {
    throw new Error("session_id and npc_id are required");
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
