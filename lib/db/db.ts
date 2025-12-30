import { query as baseQuery } from "@/lib/db";

/**
 * Enable verbose SQL logging at runtime:
 *   SQL_DEBUG=1
 *
 * Optional:
 *   SQL_DEBUG_VALUES=1   (also prints params)
 */
const SQL_DEBUG = process.env.SQL_DEBUG === "1";
const SQL_DEBUG_VALUES = process.env.SQL_DEBUG_VALUES === "1";

export type DbQueryResult<Row = any> = {
  rows: Row[];
  rowCount?: number;
  command?: string;
};

/**
 * Type-safe wrapper around /lib/db/index.js `query()`,
 * with optional runtime SQL timing/logging for debugging.
 */
export async function query<Row = any>(
  text: string,
  params: any[] = []
): Promise<DbQueryResult<Row>> {
  const start = SQL_DEBUG ? Date.now() : 0;

  try {
    const res = (await baseQuery(text, params)) as DbQueryResult<Row>;
    if (SQL_DEBUG) {
      const ms = Date.now() - start;
      // Keep logs compact, but useful
      console.log(`[db] ${ms}ms ${compactSql(text)}`);
      if (SQL_DEBUG_VALUES) {
        console.log(`[db] params:`, safeParams(params));
      }
    }
    return res;
  } catch (err: any) {
    if (SQL_DEBUG) {
      const ms = Date.now() - start;
      console.error(`[db] ERROR after ${ms}ms ${compactSql(text)}`);
      if (SQL_DEBUG_VALUES) {
        console.error(`[db] params:`, safeParams(params));
      }
    }
    throw err;
  }
}

/* -------------------------------------------------
   Identifier helpers (SAFE dynamic SQL)
-------------------------------------------------- */

/**
 * Quote a SQL identifier safely (table/column name).
 * Only allows [A-Za-z_][A-Za-z0-9_]* to avoid injection.
 */
export function ident(name: string): string {
  if (!isSafeIdent(name)) {
    throw new Error(`Unsafe SQL identifier: "${name}"`);
  }
  return `"${name}"`;
}

export function identList(names: string[]): string {
  return names.map(ident).join(", ");
}

/**
 * Build: $1, $2, $3...
 */
export function placeholders(count: number, startIndex = 1): string {
  return Array.from({ length: count }, (_, i) => `$${i + startIndex}`).join(", ");
}

export function isSafeIdent(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

/**
 * Build an INSERT statement for a dynamic set of columns.
 * Returns { sql, params } suitable for query(sql, params)
 */
export function buildInsert({
  table,
  data,
}: {
  table: string;
  data: Record<string, any>;
}): { sql: string; params: any[] } {
  const cols = Object.keys(data);
  if (!cols.length) {
    throw new Error(`buildInsert: no columns provided for table "${table}"`);
  }

  const params = cols.map((c) => data[c]);
  const sql = `
    INSERT INTO ${ident(table)} (${identList(cols)})
    VALUES (${placeholders(cols.length)})
    RETURNING *
  `;

  return { sql, params };
}

/* -------------------------------------------------
   Small utilities
-------------------------------------------------- */

function compactSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim();
}

function safeParams(params: any[]) {
  // Avoid logging huge blobs
  return params.map((p) => {
    if (p === null || p === undefined) return p;
    const t = typeof p;
    if (t === "string" && p.length > 300) return p.slice(0, 300) + "…";
    return p;
  });
}
