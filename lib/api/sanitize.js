export function safeText(value, max = 10000) {
  if (typeof value !== "string") return null;
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
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
