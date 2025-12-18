export const cmApi = {
  async list(type) {
    const res = await fetch(apiPath(type), {
      cache: "no-store",
      headers: {
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Failed to list ${type}: ${msg}`);
    }

    return normalizeRows(await res.json());
  },

  async get(type, id) {
    const res = await fetch(`${apiPath(type)}/${id}`, {
      cache: "no-store",
      headers: {
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Failed to get ${type}/${id}: ${msg}`);
    }

    return normalizeRow(await res.json());
  },

  async create(type, record) {
    const payload = denormalizeRecord(record);

    const res = await fetch(apiPath(type), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Failed to create ${type}: ${msg}`);
    }

    return normalizeRow(await res.json());
  },

  async update(type, id, record) {
    const payload = denormalizeRecord(record);

    const res = await fetch(`${apiPath(type)}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Failed to update ${type}/${id}: ${msg}`);
    }

    return normalizeRow(await res.json());
  },

  async remove(type, id) {
    const res = await fetch(`${apiPath(type)}/${id}`, {
      method: "DELETE",
      headers: {
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Failed to delete ${type}/${id}: ${msg}`);
    }

    return res.json();
  },
};
