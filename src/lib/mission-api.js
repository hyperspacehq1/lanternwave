// src/lib/mission-api.js
const BASE = "/.netlify/functions";

// Local storage for admin key
export function getStoredAdminKey() {
  return localStorage.getItem("admin_api_key") || "";
}

export function setStoredAdminKey(key) {
  localStorage.setItem("admin_api_key", key);
}

// Wrapper for authenticated calls
async function apiFetch(fnName, method = "GET", body = null, query = "") {
  const key = getStoredAdminKey();

  const url = `${BASE}/${fnName}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": key,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) throw new Error(`API Error: ${res.status}`);

  return res.json();
}

// --------------------------------------------------
//  Mission Sessions
// --------------------------------------------------
export function listSessions() {
  return apiFetch("api-mission-sessions", "GET");
}

export function createSession(missionId, sessionName, gmNotes = "") {
  return apiFetch("api-mission-sessions", "POST", {
    mission_id: missionId,
    session_name: sessionName,
    gm_notes: gmNotes,
  });
}

export function getSession(id) {
  return apiFetch("api-mission-session", "GET", null, `id=${id}`);
}

export function updateSession(id, { session_name, gm_notes, status }) {
  return apiFetch("api-mission-session", "PUT", {
    session_name,
    gm_notes,
    status,
  }, `id=${id}`);
}

export function resetSession(id) {
  return apiFetch("api-mission-session", "DELETE", null, `id=${id}`);
}

// --------------------------------------------------
// Players
// --------------------------------------------------
export function listSessionPlayers(sessionId) {
  return apiFetch("api-session-players", "GET", null, `session_id=${sessionId}`);
}

export function addSessionPlayer(sessionId, phone_number, player_name = "") {
  return apiFetch("api-session-players", "POST", {
    phone_number,
    player_name,
  }, `session_id=${sessionId}`);
}

export function removeSessionPlayer(sessionId, phone_number) {
  return apiFetch("api-session-players", "DELETE", null, 
    `session_id=${sessionId}&phone=${encodeURIComponent(phone_number)}`
  );
}

// --------------------------------------------------
// Events
// --------------------------------------------------
export function listSessionEvents(sessionId) {
  return apiFetch("api-events", "GET", null, `session_id=${sessionId}`);
}

// --------------------------------------------------
// Logs
// --------------------------------------------------
export function listSessionLogs(sessionId) {
  return apiFetch("api-session-logs", "GET", null, `session_id=${sessionId}`);
}
