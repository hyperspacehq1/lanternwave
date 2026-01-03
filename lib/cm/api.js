import {
  normalizeRow,
  normalizeRows,
  denormalizeRecord,
} from "@/lib/cm/model";

/* -------------------------------------------------
   UI entity → API route mapping
-------------------------------------------------- */
const API_MAP = {
  campaigns: "campaigns",
  sessions: "sessions",
  events: "events",
  encounters: "encounters",
  locations: "locations",
  items: "items",
  npcs: "npcs",
  players: "players",
};

function apiPath(type) {
  const mapped = API_MAP[type];
  if (!mapped) throw new Error(`cmApi: unknown type "${type}"`);
  return `/api/${mapped}`;
}

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
async function readErrorText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function fetchWithFallback(primaryUrl, fallbackUrl, options) {
  let res = await fetch(primaryUrl, options);

  if (!res.ok && fallbackUrl && (res.status === 404 || res.status === 405)) {
    res = await fetch(fallbackUrl, options);
  }

  if (!res.ok) {
    const msg = await readErrorText(res);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return res;
}

/* -------------------------------------------------
   Campaign Manager API client
-------------------------------------------------- */
export const cmApi = {
  async list(type, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `${apiPath(type)}${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const msg = await readErrorText(res);
      throw new Error(`Failed to list ${type}: ${msg || `HTTP ${res.status}`}`);
    }

    // ✅ OPTION A: bypass normalization for list payloads
    const data = await res.json();
    return Array.isArray(data) ? data : normalizeRows(data);
  },

  async get(type, id) {
    const base = apiPath(type);

    const primary = `${base}?id=${encodeURIComponent(id)}`;
    const fallback = `${base}/${encodeURIComponent(id)}`;

    const res = await fetchWithFallback(primary, fallback, {
      cache: "no-store",
    });

    return normalizeRow(await res.json());
  },

  async create(type, record) {
    const payload = denormalizeRecord(record);

    const res = await fetch(apiPath(type), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await readErrorText(res);
      throw new Error(`Failed to create ${type}: ${msg || `HTTP ${res.status}`}`);
    }

    return normalizeRow(await res.json());
  },

  async update(type, id, record) {
    const payload = denormalizeRecord(record);
    const base = apiPath(type);

    const primary = `${base}?id=${encodeURIComponent(id)}`;
    const fallback = `${base}/${encodeURIComponent(id)}`;

    const res = await fetchWithFallback(primary, fallback, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await res.json();
  },

  async remove(type, id) {
    const base = apiPath(type);

    const primary = `${base}?id=${encodeURIComponent(id)}`;
    const fallback = `${base}/${encodeURIComponent(id)}`;

    const res = await fetchWithFallback(primary, fallback, {
      method: "DELETE",
    });

    return res.json();
  },

  async delete(type, id) {
    return this.remove(type, id);
  },
};
