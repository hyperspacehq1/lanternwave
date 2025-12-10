export const cmApi = {
  async list(type) {
    const res = await fetch(`/api/${type}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to list ${type}`);
    return res.json();
  },

  async create(type, data) {
    const res = await fetch(`/api/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create ${type}`);
    return res.json();
  },

  async update(type, id, data) {
    const res = await fetch(`/api/${type}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update ${type}`);
    return res.json();
  },

  async remove(type, id) {
    const res = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete ${type}`);
    return res.json();
  }
};
