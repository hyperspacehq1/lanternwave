// lib/cm/client.js
"use client";

import { normalizeRow, normalizeRows, denormalizeRecord } from "./model";

const ADMIN_HEADER_KEY = "x-admin-api-key";

// ---------------------------------------------------------------------------
// ENDPOINTS — Extended to support Conditions + Condition Templates
// ---------------------------------------------------------------------------
const ENTITY_ENDPOINTS = {
  campaigns: "/api/campaigns",
  sessions: "/api/sessions",
  events: "/api/events",
  playerCharacters: "/api/player-characters",
  npcs: "/api/npcs",
  encounters: "/api/encounters",
  quests: "/api/quests",
  locations: "/api/locations",
  items: "/api/items",
  lore: "/api/lore",
  logs: "/api/logs",

  // NEW:
  conditions: "/api/conditions",
  conditionTemplates: "/api/condition-templates", // Optional — only if implemented
};

// ---------------------------------------------------------------------------
// Local Storage Admin Key
// ---------------------------------------------------------------------------
export function getAdminKey() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("campaign_admin_key") || "";
}

export function setAdminKey(key) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("campaign_admin_key", key || "");
}

// ---------------------------------------------------------------------------
// Auth Headers
// ---------------------------------------------------------------------------
export function authHeaders() {
  const k = getAdminKey();
  return k ? { [ADMIN_HEADER_KEY]: k } : {};
}

// ---------------------------------------------------------------------------
// Low-Level Request Helper
// ---------------------------------------------------------------------------
async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(options.headers || {}),
  };

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

// ---------------------------------------------------------------------------
// Resolve Entity Endpoint
// ---------------------------------------------------------------------------
function endpointFor(type) {
  const url = ENTITY_ENDPOINTS[type];
  if (!url) throw new Error(`Unknown entity type: ${type}`);
  return url;
}

// ---------------------------------------------------------------------------
// SERVICE API (cmApi)
// ---------------------------------------------------------------------------
export const cmApi = {
  // LIST
  async list(type, params) {
    let url = endpointFor(type);
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }
    const data = await apiRequest(url, { method: "GET" });
    return normalizeRows(data);
  },

  // GET ONE
  async get(type, id) {
    const url = `${endpointFor(type)}?id=${encodeURIComponent(id)}`;
    const data = await apiRequest(url, { method: "GET" });
    return normalizeRow(data);
  },

  // CREATE
  async create(type, record) {
    const payload = denormalizeRecord(record);
    const data = await apiRequest(endpointFor(type), {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeRow(data);
  },

  // UPDATE
  async update(type, id, record) {
    const payload = denormalizeRecord(record);
    const url = `${endpointFor(type)}?id=${encodeURIComponent(id)}`;
    const data = await apiRequest(url, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return normalizeRow(data);
  },

  // DELETE
  async remove(type, id) {
    const url = `${endpointFor(type)}?id=${encodeURIComponent(id)}`;
    await apiRequest(url, { method: "DELETE" });
    return true;
  },

  // -------------------------------------------------------------------------
  // RELATIONSHIP HELPERS
  // -------------------------------------------------------------------------
  async sessionsForCampaign(campaignId) {
    return this.list("sessions", { campaign_id: campaignId });
  },

  async eventsForSession(sessionId) {
    return this.list("events", { session_id: sessionId });
  },

  async encountersForSession(sessionId) {
    return this.list("encounters", { session_id: sessionId });
  },

  async logsForSession(sessionId) {
    return this.list("logs", { session_id: sessionId });
  },

  // -------------------------------------------------------------------------
  // CONDITIONS (DB-backed)
  // -------------------------------------------------------------------------
  conditions: {
    list: () => apiRequest("/api/conditions", { method: "GET" }).then(normalizeRows),

    create: (record) =>
      apiRequest("/api/conditions", {
        method: "POST",
        body: JSON.stringify(denormalizeRecord(record)),
      }).then(normalizeRow),

    update: (id, record) =>
      apiRequest(`/api/conditions?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(denormalizeRecord(record)),
      }).then(normalizeRow),

    remove: (id) =>
      apiRequest(`/api/conditions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  },

  // -------------------------------------------------------------------------
  // CONDITION TEMPLATES (optional)
  // -------------------------------------------------------------------------
  conditionTemplates: {
    list: () =>
      apiRequest("/api/condition-templates", { method: "GET" }).then(normalizeRows),
  },
};
