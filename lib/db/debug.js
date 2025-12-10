import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { randomUUID } from "crypto";

export async function debugDB() {
  const results = {};

  try {
    // 1. Confirm DB URL
    results.dbUrl = process.env.NETLIFY_DATABASE_URL ? "OK" : "MISSING";

    // 2. Simple drizzle read
    results.drizzleSelect = await db.select().from(campaigns).limit(5);

    // 3. Raw neon SQL read (via Drizzle's passthrough)
    results.rawSelect = await db.execute(`SELECT id, name, created_at FROM campaigns LIMIT 5`);

    // 4. Test insert
    const testId = randomUUID();
    const insertResult = await db.execute(
      `INSERT INTO campaigns (id, name, description, world_setting, campaign_date, created_at, updated_at)
       VALUES ($1, 'Test Campaign', 'Debug insert', 'Earth', NOW(), NOW(), NOW())
       RETURNING *`,
      [testId]
    );

    results.inserted = insertResult.rows[0];

    return {
      ok: true,
      results
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      stack: err.stack
    };
  }
}
