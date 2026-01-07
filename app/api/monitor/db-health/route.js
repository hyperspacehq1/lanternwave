import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Alert cooldown in minutes
const ALERT_COOLDOWN_MINUTES = 60;
const ALERT_KEY = "db-health";

export async function GET(req) {
  try {
    const session = await requireAuth();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // -------------------------------------------------
    // Health Checks
    // -------------------------------------------------

    const activeResult = await query(`
      SELECT COUNT(*)::int AS count
      FROM pg_stat_activity
      WHERE state = 'active'
    `);

    const longRunning = await query(`
      SELECT
        pid,
        EXTRACT(EPOCH FROM (now() - query_start)) AS duration_seconds
      FROM pg_stat_activity
      WHERE state = 'active'
        AND now() - query_start > interval '60 seconds'
    `);

    const deadTuples = await query(`
      SELECT SUM(n_dead_tup)::int AS dead
      FROM pg_stat_user_tables
    `);

    const cache = await query(`
      SELECT
        ROUND(
          SUM(blks_hit)::numeric /
          NULLIF(SUM(blks_hit + blks_read), 0) * 100,
          2
        ) AS hit_ratio
      FROM pg_stat_database
    `);

    // -------------------------------------------------
    // Evaluate alert conditions
    // -------------------------------------------------

    const alerts = [];

    if (activeResult.rows[0].count > 10) {
      alerts.push(`High active connections: ${activeResult.rows[0].count}`);
    }

    if (deadTuples.rows[0].dead > 100000) {
      alerts.push(`High dead tuples: ${deadTuples.rows[0].dead}`);
    }

    if (cache.rows[0].hit_ratio !== null && cache.rows[0].hit_ratio < 98) {
      alerts.push(`Low cache hit ratio: ${cache.rows[0].hit_ratio}%`);
    }

    if (longRunning.rows.length > 0) {
      alerts.push(`Long-running queries detected: ${longRunning.rows.length}`);
    }

    // -------------------------------------------------
    // Alert cooldown
    // -------------------------------------------------

    let shouldSendAlert = false;

    if (alerts.length) {
      const lastAlert = await query(
        `SELECT last_sent_at FROM system_alerts WHERE key = $1`,
        [ALERT_KEY]
      );

      if (!lastAlert.rows.length) {
        shouldSendAlert = true;
      } else {
        const lastSent = new Date(lastAlert.rows[0].last_sent_at);
        const minutesSince =
          (Date.now() - lastSent.getTime()) / 1000 / 60;

        if (minutesSince >= ALERT_COOLDOWN_MINUTES) {
          shouldSendAlert = true;
        }
      }
    }

    // -------------------------------------------------
    // Send alert (LAZY IMPORT)
    // -------------------------------------------------

    if (alerts.length && shouldSendAlert) {
      const { sendPasswordResetEmail } = await import("@/lib/email");

      await sendPasswordResetEmail({
        to: "admin@lanternwave.com",
        firstName: "Admin",
        resetUrl: "https://lanternwave.com/admin/db-health",
        subject: "🚨 Database Health Alert",
        customMessage: alerts.join("\n"),
      });

      await query(
        `
        INSERT INTO system_alerts (key, last_sent_at)
        VALUES ($1, NOW())
        ON CONFLICT (key)
        DO UPDATE SET last_sent_at = EXCLUDED.last_sent_at
        `,
        [ALERT_KEY]
      );
    }

    return Response.json({
      ok: true,
      alerts,
      stats: {
        active: activeResult.rows[0].count,
        deadTuples: deadTuples.rows[0].dead,
        cacheHit: cache.rows[0].hit_ratio,
      },
    });
  } catch (err) {
    console.error("DB health check failed", err);
    return Response.json(
      { error: "Failed to run DB health check" },
      { status: 500 }
    );
  }
}
