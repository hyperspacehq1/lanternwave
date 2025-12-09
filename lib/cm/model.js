// lib/cm/model.js

// snake_case → camelCase
export function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// camelCase → snake_case
export function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

// Normalize a DB row (snake_case) to a UI record (camelCase)
export function normalizeRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[snakeToCamel(key)] = value;
  }
  return out;
}

// Normalize an array of rows
export function normalizeRows(rows) {
  return (rows || []).map(normalizeRow);
}

// Convert a UI record (camelCase) to API payload (snake_case)
export function denormalizeRecord(record) {
  if (!record || typeof record !== "object") return record;
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith("_")) continue; // internal flags
    out[camelToSnake(key)] = value;
  }
  return out;
}
