export function safeText(value, max = 10000) {
  if (typeof value !== "string") return null;

  return value
    .normalize("NFKC")
    // remove control chars EXCEPT:
    // \n (0x0A), \r (0x0D), \t (0x09)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, max);
}

export function sanitizeRow(row, limits = {}) {
  if (!row || typeof row !== "object") return row;

  const clean = { ...row };

  for (const [key, value] of Object.entries(clean)) {
    if (typeof value === "string") {
      const max = limits[key] ?? 10000;
      clean[key] = safeText(value, max);
    }
  }

  return clean;
}

export function sanitizeRows(rows, limits = {}) {
  return Array.isArray(rows)
    ? rows.map((r) => sanitizeRow(r, limits))
    : [];
}
