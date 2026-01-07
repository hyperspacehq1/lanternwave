import { cookies } from "next/headers";
import { query } from "@/lib/db";

export async function requireAuth() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get("lw_session")?.value;

  if (!sessionId) return null;

  const result = await query(
    `
    SELECT
      s.user_id,
      s.tenant_id,
      u.email,
      tu.role
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    JOIN tenant_users tu
      ON tu.user_id = s.user_id
     AND tu.tenant_id = s.tenant_id
    WHERE s.id = $1
      AND s.expires_at > NOW()
    `,
    [sessionId]
  );

  if (!result.rows.length) return null;

  return result.rows[0];
}
