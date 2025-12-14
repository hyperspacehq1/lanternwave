import { db } from "@/lib/db";

const MAX_ATTEMPTS = 7;
const WINDOW_MS = 1000 * 60 * 60; // 1 hour

export async function rateLimit({ ip, route }) {
  const now = new Date();

  const res = await db.query(
    `
    SELECT id, count, window_start
    FROM auth_rate_limits
    WHERE ip = $1 AND route = $2
    LIMIT 1
    `,
    [ip, route]
  );

  // No record yet → create one
  if (!res.rows.length) {
    await db.query(
      `
      INSERT INTO auth_rate_limits (ip, route, count, window_start)
      VALUES ($1, $2, 1, $3)
      `,
      [ip, route, now]
    );
    return { ok: true };
  }

  const row = res.rows[0];
  const windowStart = new Date(row.window_start);

  // Window expired → reset
  if (now - windowStart > WINDOW_MS) {
    await db.query(
      `
      UPDATE auth_rate_limits
      SET count = 1, window_start = $1
      WHERE id = $2
      `,
      [now, row.id]
    );
    return { ok: true };
  }

  // Still in window
  if (row.count >= MAX_ATTEMPTS) {
    return {
      ok: false,
      retryAfter: Math.ceil(
        (WINDOW_MS - (now - windowStart)) / 1000
      ),
    };
  }

  // Increment
  await db.query(
    `
    UPDATE auth_rate_limits
    SET count = count + 1
    WHERE id = $1
    `,
    [row.id]
  );

  return { ok: true };
}
