export const ADMIN_HEADER_KEY = "x-admin-api-key";

export function getAdminKey() {
  return localStorage.getItem("lw-admin-key") || "";
}

export function setAdminKey(key) {
  localStorage.setItem("lw-admin-key", key);
}

export const cmApi = {
  async get(path) {
    return fetch(`/api/${path}`, {
      headers: {
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
    }).then((r) => r.json());
  },
  async post(path, body) {
    return fetch(`/api/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
      body: JSON.stringify(body),
    }).then((r) => r.json());
  },
  async delete(path) {
    return fetch(`/api/${path}`, {
      method: "DELETE",
      headers: {
        [ADMIN_HEADER_KEY]: getAdminKey(),
      },
    }).then((r) => r.json());
  },
};
