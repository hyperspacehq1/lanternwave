// Unified Campaign Manager API Client
// Includes admin authentication + dynamic CRUD support

import { ADMIN_HEADER_KEY, getAdminKey } from "@/lib/cm/client";

export const cmApi = {
  async list(type) {
    const res = await fetch(`/api/${type}`, {
      cache: "no-store",
      headers: {
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
    });
    if (!res.ok) throw new Error(`Failed to list ${type}`);
    return res.json();
  },

  async create(type, data) {
    const res = await fetch(`/api/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create ${type}`);
    return res.json();
  },

  async update(type, id, data) {
    const res = await fetch(`/api/${type}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update ${type}`);
    return res.json();
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
