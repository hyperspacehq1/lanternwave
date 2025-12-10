// /lib/db/debug.js
import { query } from "@/lib/db";
import { db } from "@/lib/db";           // optional: adds drizzle test
import { campaigns } from "@/lib/db/schema";
import { randomUUID } from "crypto";

export async function debugDB() {
  const results = {};

  try {
    // 1. Validate DB URL exists
    results.dbUrl = process.env.NETLIFY_DATABASE_URL ? "OK" : "MISSING";

    // 2. Drizzle read test (proves drizzle client is operating)
    results.drizzleSelect = await db
      .select()
      .from(campaigns)
      .limit(5);

    // 3. Raw SQL read test using corrected query helper
    results.rawSelect = await query(
      "SELECT id, name, created_at FROM campaigns LIMIT 5"
    );

    // 4. Insert test using $1 placeholder (must use query(), not tagged template)
    const testId = randomUUID();
    const insertResult = await query(
      `INSERT INTO campaigns (
         id, name, description, world_setting, campaign_date, created_at, updated_at
       )
       VALUES (
         $1, 'Test Campaign', 'Debug insert', 'Earth', NOW(), NOW(), NOW()
       )
       RETURNING *`,
      [testId]
    );

    results.inserted = insertResult.rows[0];

    return {
      ok: true,
      results,
    };

  } catch (err) {
    return {
      ok: false,
      error: err.message,
      stack: err.stack,
    };
  }
}
