import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export async function debugDB() {
  const results = {};

  try {
    results.dbUrl = process.env.NETLIFY_DATABASE_URL ? "OK" : "MISSING";

    // Read test
    results.rawSelect = await query(`SELECT id, name, created_at FROM campaigns LIMIT 5`);

    // Insert test (ALWAYS WORKS across Neon/Drizzle)
    const testId = randomUUID();
    const insertResult = await query(
      `INSERT INTO campaigns (id, name, description, world_setting, campaign_date, created_at, updated_at)
       VALUES ($1, 'Test Campaign', 'Debug insert', 'Earth', NOW(), NOW(), NOW())
       RETURNING *`,
      [testId]
    );

    results.inserted = insertResult.rows[0];

    return { ok: true, results };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      stack: err.stack
    };
  }
}
