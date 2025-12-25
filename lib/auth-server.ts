import { cookies } from "next/headers";
import { query } from "@/lib/db";

export async function requireAuth() {
  const cookieStore = cookies();
  const session = cookieStore.get("lw_session")?.value;

  if (!session) return null;

  const result = await query(
    `
    SELECT u.id, u.email, u.is_admin
    FROM users u
    JOIN sessions s ON s.user_id = u.id
    WHERE s.token = $1
    `,
    [session]
  );

  if (!result.rows.length) return null;

  return result.rows[0];
}
