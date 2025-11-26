export const requireAdmin = (headers) => {
  const key = headers["x-admin-key"] || headers["X-Admin-Key"];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return { ok: false, response: { statusCode: 401, body: "Unauthorized" } };
  }
  return { ok: true };
};
