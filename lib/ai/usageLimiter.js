import { sql } from "@/lib/db";

export async function checkAndConsumeAiUsage({
  tenantId,
  action,
  limit = 50,
  windowHours = 24,
}) {
  const result = await sql`
    SELECT COUNT(*)::int AS count
    FROM tenant_ai_usage
    WHERE tenant_id = ${tenantId}
      AND action = ${action}
      AND created_at > NOW() - INTERVAL '${windowHours} hours'
  `;

  if (result.rows[0].count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await sql`
    INSERT INTO tenant_ai_usage (tenant_id, action)
    VALUES (${tenantId}, ${action})
  `;

  return {
    allowed: true,
    remaining: limit - (result.rows[0].count + 1),
  };
}
