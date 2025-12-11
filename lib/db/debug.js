// /lib/db/debug.js
import { query, db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { randomUUID } from "crypto";

export async function debugDB() {
  const results = {};

  try {
    // Confirm DB URL
    results.dbUrl = process.env.NETLIFY_DATABASE_URL ? "OK" : "MISSING";

    // Drizzle read test
    results.drizzleSelect = await db.select().from(campaigns).limit(5);

    // Raw SQL read test
    results.rawSelect = await query(
      "SELECT id, name, created_at FROM campaigns LIMIT 5"
    );

    // Insert test
    const testId = randomUUID();
    const insertResult = await query(
      `INSERT INTO campaigns (
         id, name, description, world_setting, campaign_date, created_at, updated_at
       )
       VALUES ($1, 'Test Campaign', 'Debug insert', 'Earth', NOW(), NOW(), NOW())
       RETURNING *`,
      [testId]
    );

    // SAFELY UNDERSTAND THE INSERT RESPONSE FORMAT
    let insertedRow = null;

    if (insertResult?.rows?.[0]) {
      insertedRow = insertResult.rows[0];
    } else if (Array.isArray(insertResult) && insertResult[0]) {
      insertedRow = insertResult[0];
    } else if (typeof insertResult === "object") {
      insertedRow = insertResult;
    }

    results.inserted = insertedRow;

    return { ok: true, results };

  } catch (err) {
    return {
      ok: false,
      error: err.message,
      stack: err.stack,
    };
  }
}
