import { ADMIN_HEADER_KEY, getAdminKey } from "@/lib/cm/client";
import { normalizeRow, normalizeRows, denormalizeRecord } from "@/lib/cm/model";

export const cmApi = {
  async list(type) {
    const res = await fetch(`/api/${type}`, {
      headers: {
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to list ${type}`);
    return normalizeRows(await res.json());
  },

  async get(type, id) {
    const res = await fetch(`/api/${type}/${id}`, {
      headers: {
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to get ${type}`);
    return normalizeRow(await res.json());
  },

  async create(type, record) {
    const payload = denormalizeRecord(record);
    const res = await fetch(`/api/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to create ${type}`);
    return normalizeRow(await res.json());
  },

  async update(type, id, record) {
    const payload = denormalizeRecord(record);
    const res = await fetch(`/api/${type}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to update ${type}`);
    return normalizeRow(await res.json());
  },

  async remove(type, id) {
    const res = await fetch(`/api/${type}/${id}`, {
      method: "DELETE",
      headers: {
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
    });
    if (!res.ok) throw new Error(`Failed to delete ${type}`);
    return res.json();
  },
};
