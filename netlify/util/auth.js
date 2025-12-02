function requireAdmin(headers = {}) {
  const key = headers["x-admin-key"] || headers["X-Admin-Key"];

  if (!key || key !== process.env.ADMIN_KEY) {
    return {
      ok: false,
      response: {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      },
    };
  }

  return { ok: true };
}

module.exports = {
  requireAdmin,
};
