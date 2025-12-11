// lib/db/debug.js
import { query } from "@/lib/db";

export async function debugDB() {
  try {
    const tables = await query`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const counts = {};
    for (const t of tables) {
      const name = t.table_name;
      const rows = await query(`SELECT COUNT(*) FROM ${name}`);
      counts[name] = rows[0].count;
    }

    return { tables, counts };
  } catch (err) {
    return { error: err.message };
  }
}
